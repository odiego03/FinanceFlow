package com.financeflow.service;

import com.financeflow.dto.RedefinirSenhaRequisicao;
import com.financeflow.exception.CodigoRedefinicaoInvalidoException;
import com.financeflow.model.CodigoRedefinicaoSenha;
import com.financeflow.model.Usuario;
import com.financeflow.repository.CodigoRedefinicaoSenhaRepository;
import com.financeflow.repository.UsuarioRepository;
import com.financeflow.security.LimitadorTentativasLogin;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * "Esqueci minha senha": um código de 6 dígitos vai por e-mail e, com ele, a pessoa escolhe uma senha nova.
 * - O código vale 15 minutos, aceita 5 tentativas erradas e só o último pedido vale.
 * - Um pedido novo só gera código depois de 1 minuto do anterior, pra ninguém lotar a caixa de alguém.
 * - A resposta do pedido é sempre a mesma, exista a conta ou não, pra não revelar quem está cadastrado.
 */
@Service
public class RedefinicaoSenhaService {

    static final Duration VALIDADE = Duration.ofMinutes(15);
    static final Duration INTERVALO_MINIMO = Duration.ofMinutes(1);
    static final int MAXIMO_TENTATIVAS = 5;

    private final UsuarioRepository repositorioUsuario;
    private final CodigoRedefinicaoSenhaRepository repositorioCodigo;
    private final PasswordEncoder codificador;
    private final EnvioEmailService envioEmail;
    private final LimitadorTentativasLogin limitadorLogin;
    private final SecureRandom aleatorio = new SecureRandom();

    public RedefinicaoSenhaService(UsuarioRepository repositorioUsuario, CodigoRedefinicaoSenhaRepository repositorioCodigo,
                                   PasswordEncoder codificador, EnvioEmailService envioEmail,
                                   LimitadorTentativasLogin limitadorLogin) {
        this.repositorioUsuario = repositorioUsuario;
        this.repositorioCodigo = repositorioCodigo;
        this.codificador = codificador;
        this.envioEmail = envioEmail;
        this.limitadorLogin = limitadorLogin;
    }

    @Transactional
    public void solicitar(String emailInformado) {
        String email = UsuarioService.normalizarEmail(emailInformado);
        String codigo = "%06d".formatted(aleatorio.nextInt(1_000_000));
        // Calcula o hash mesmo sem conta, pra resposta levar o mesmo tempo nos dois casos
        String hash = codificador.encode(codigo);

        Optional<Usuario> encontrado = repositorioUsuario.findByEmail(email);
        if (encontrado.isEmpty()) {
            return;
        }
        Usuario usuario = encontrado.get();
        LocalDateTime agora = LocalDateTime.now();

        boolean pediuAgoraPouco = repositorioCodigo.findFirstByUsuarioIdOrderByCriadoEmDesc(usuario.getId())
                .map(anterior -> anterior.getCriadoEm().plus(INTERVALO_MINIMO).isAfter(agora))
                .orElse(false);
        if (pediuAgoraPouco) {
            return;
        }

        repositorioCodigo.deleteByUsuarioId(usuario.getId());
        CodigoRedefinicaoSenha registro = new CodigoRedefinicaoSenha();
        registro.setUsuario(usuario);
        registro.setCodigoHash(hash);
        registro.setCriadoEm(agora);
        registro.setExpiraEm(agora.plus(VALIDADE));
        repositorioCodigo.save(registro);

        envioEmail.enviarCodigoRedefinicao(usuario.getEmail(), usuario.getNome(), codigo, VALIDADE.toMinutes());
    }

    // Sem rollback no código errado: a tentativa gasta tem que ficar gravada
    @Transactional(noRollbackFor = CodigoRedefinicaoInvalidoException.class)
    public void redefinir(RedefinirSenhaRequisicao requisicao) {
        String email = UsuarioService.normalizarEmail(requisicao.email());
        // Lista pelo mesmo motivo do login: contas antigas podem diferir só na caixa do email
        List<Usuario> usuarios = repositorioUsuario.findAllByEmailIgnoreCase(email);
        LocalDateTime agora = LocalDateTime.now();

        for (Usuario usuario : usuarios) {
            Optional<CodigoRedefinicaoSenha> ativo = repositorioCodigo.findFirstByUsuarioIdOrderByCriadoEmDesc(usuario.getId())
                    .filter(codigo -> codigo.getExpiraEm().isAfter(agora))
                    .filter(codigo -> codigo.getTentativas() < MAXIMO_TENTATIVAS);
            if (ativo.isEmpty()) {
                continue;
            }
            CodigoRedefinicaoSenha codigo = ativo.get();
            if (!codificador.matches(requisicao.codigo(), codigo.getCodigoHash())) {
                codigo.setTentativas(codigo.getTentativas() + 1);
                repositorioCodigo.save(codigo);
                continue;
            }

            usuario.setSenhaHash(codificador.encode(requisicao.novaSenha()));
            repositorioUsuario.save(usuario);
            repositorioCodigo.deleteByUsuarioId(usuario.getId());
            // Quem acabou de provar que é dono do email não deve continuar bloqueado no login
            limitadorLogin.registrarSucesso(UsuarioService.normalizarEmail(usuario.getEmail()));
            return;
        }
        throw new CodigoRedefinicaoInvalidoException();
    }
}
