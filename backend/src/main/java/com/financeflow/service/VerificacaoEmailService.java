package com.financeflow.service;

import com.financeflow.exception.TokenVerificacaoInvalidoException;
import com.financeflow.model.TokenVerificacaoEmail;
import com.financeflow.model.Usuario;
import com.financeflow.repository.TokenVerificacaoEmailRepository;
import com.financeflow.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Confirmação do e-mail no cadastro: a conta nasce não confirmada e só entra depois de clicar no botão do e-mail.
 * - O link carrega um token aleatório (256 bits); no banco fica só o hash SHA-256 dele.
 * - Vale 24 horas e só o último e-mail enviado vale: pedir outro invalida o anterior.
 * - Um e-mail novo só sai depois de 1 minuto do anterior, pra ninguém lotar a caixa de alguém.
 * - O link abre uma página do frontend, que é quem chama {@link #confirmar}: assim um leitor de links de e-mail
 *   (que só abre a URL) não confirma a conta sozinho.
 */
@Service
public class VerificacaoEmailService {

    static final Duration VALIDADE = Duration.ofHours(24);
    static final Duration INTERVALO_MINIMO = Duration.ofMinutes(1);

    private final UsuarioRepository repositorioUsuario;
    private final TokenVerificacaoEmailRepository repositorioToken;
    private final EnvioEmailService envioEmail;
    private final String urlFrontend;
    private final SecureRandom aleatorio = new SecureRandom();

    public VerificacaoEmailService(UsuarioRepository repositorioUsuario, TokenVerificacaoEmailRepository repositorioToken,
                                   EnvioEmailService envioEmail, @Value("${app.url-frontend}") String urlFrontend) {
        this.repositorioUsuario = repositorioUsuario;
        this.repositorioToken = repositorioToken;
        this.envioEmail = envioEmail;
        this.urlFrontend = urlFrontend;
    }

    // Chamado dentro da transação do cadastro: se algo falhar lá, o token também não fica gravado
    @Transactional
    public void enviarParaNovoUsuario(Usuario usuario) {
        emitirEEnviar(usuario, LocalDateTime.now());
    }

    /**
     * "Reenviar e-mail de confirmação". Não devolve nada: a resposta é sempre a mesma, tenha o e-mail conta ou não,
     * já esteja confirmada ou não, pra não revelar quem está cadastrado.
     */
    @Transactional
    public void reenviar(String emailInformado) {
        String email = UsuarioService.normalizarEmail(emailInformado);
        LocalDateTime agora = LocalDateTime.now();

        // Lista pelo mesmo motivo do login: contas antigas podem diferir só na caixa do email
        for (Usuario usuario : repositorioUsuario.findAllByEmailIgnoreCase(email)) {
            if (usuario.isEmailVerificado()) {
                continue;
            }
            boolean pediuAgoraPouco = repositorioToken.findFirstByUsuarioIdOrderByCriadoEmDesc(usuario.getId())
                    .map(anterior -> anterior.getCriadoEm().plus(INTERVALO_MINIMO).isAfter(agora))
                    .orElse(false);
            if (!pediuAgoraPouco) {
                emitirEEnviar(usuario, agora);
            }
        }
    }

    @Transactional
    public void confirmar(String token) {
        LocalDateTime agora = LocalDateTime.now();
        TokenVerificacaoEmail registro = repositorioToken.findByTokenHash(hashDe(token))
                .filter(encontrado -> encontrado.getExpiraEm().isAfter(agora))
                .orElseThrow(TokenVerificacaoInvalidoException::new);

        Usuario usuario = registro.getUsuario();
        usuario.setEmailVerificado(true);
        repositorioUsuario.save(usuario);
        repositorioToken.deleteByUsuarioId(usuario.getId());
    }

    private void emitirEEnviar(Usuario usuario, LocalDateTime agora) {
        byte[] bytes = new byte[32];
        aleatorio.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        repositorioToken.deleteByUsuarioId(usuario.getId());
        TokenVerificacaoEmail registro = new TokenVerificacaoEmail();
        registro.setUsuario(usuario);
        registro.setTokenHash(hashDe(token));
        registro.setCriadoEm(agora);
        registro.setExpiraEm(agora.plus(VALIDADE));
        repositorioToken.save(registro);

        envioEmail.enviarConfirmacaoConta(usuario.getEmail(), usuario.getNome(), montarLink(token), VALIDADE.toHours());
    }

    private String montarLink(String token) {
        return urlFrontend.replaceAll("/+$", "") + "/confirmar-conta?token=" + token;
    }

    private static String hashDe(String token) {
        try {
            byte[] resumo = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(resumo);
        } catch (NoSuchAlgorithmException excecao) {
            // Todo JDK é obrigado a ter SHA-256
            throw new IllegalStateException(excecao);
        }
    }
}
