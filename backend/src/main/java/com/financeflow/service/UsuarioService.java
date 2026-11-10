package com.financeflow.service;

import com.financeflow.dto.UsuarioAtualizacaoRequisicao;
import com.financeflow.dto.UsuarioCadastroRequisicao;
import com.financeflow.dto.UsuarioResposta;
import com.financeflow.exception.EmailJaCadastradoException;
import com.financeflow.model.Usuario;
import com.financeflow.repository.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;

@Service
public class UsuarioService {

    private final UsuarioRepository repositorioUsuario;
    private final PasswordEncoder codificadorSenha;
    private final CategoriaService categoriaService;
    private final VerificacaoEmailService verificacaoEmailService;

    public UsuarioService(UsuarioRepository repositorioUsuario, PasswordEncoder codificadorSenha,
                           CategoriaService categoriaService, VerificacaoEmailService verificacaoEmailService) {
        this.repositorioUsuario = repositorioUsuario;
        this.codificadorSenha = codificadorSenha;
        this.categoriaService = categoriaService;
        this.verificacaoEmailService = verificacaoEmailService;
    }

    // Transacional: se a semeadura das categorias ou a criação do link de confirmação falhar, o usuário não fica
    // gravado pela metade
    @Transactional
    public UsuarioResposta cadastrar(UsuarioCadastroRequisicao requisicao) {
        String email = normalizarEmail(requisicao.email());
        if (repositorioUsuario.existsByEmailIgnoreCase(email)) {
            throw new EmailJaCadastradoException(email);
        }

        Usuario usuario = new Usuario();
        usuario.setNome(requisicao.nome().trim());
        usuario.setEmail(email);
        usuario.setSenhaHash(codificadorSenha.encode(requisicao.senha()));
        usuario.setCriadoEm(LocalDateTime.now());
        // Não entra até clicar no link do e-mail de confirmação
        usuario.setEmailVerificado(false);

        repositorioUsuario.save(usuario);
        categoriaService.semearPredefinidas(usuario);
        verificacaoEmailService.enviarParaNovoUsuario(usuario);

        return UsuarioResposta.de(usuario);
    }

    public UsuarioResposta buscarPorEmail(String email) {
        return UsuarioResposta.de(repositorioUsuario.buscarDoToken(email));
    }

    public UsuarioResposta atualizar(UsuarioAtualizacaoRequisicao requisicao, String email) {
        Usuario usuario = repositorioUsuario.buscarDoToken(email);
        usuario.setNome(requisicao.nome().trim());
        repositorioUsuario.save(usuario);
        return UsuarioResposta.de(usuario);
    }

    // Email não diferencia maiúsculas: "Diego@x.com" e "diego@x.com" são a mesma conta
    public static String normalizarEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
