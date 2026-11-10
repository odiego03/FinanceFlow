package com.financeflow.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.HtmlUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Manda os e-mails do sistema (código de redefinição de senha e confirmação de conta), pelo primeiro canal configurado:
 * 1. API HTTP do Brevo (BREVO_API_KEY): é o que funciona no Render grátis, que bloqueia as portas de SMTP;
 * 2. SMTP (MAIL_HOST, MAIL_USUARIO, MAIL_SENHA), ex: Gmail com senha de app, pra rodar local ou no Docker;
 * 3. nenhum: o código (ou o link) vai pro log. Só pra desenvolvimento.
 * Assíncrono: o envio demora segundos, e responder mais devagar quando o email existe revelaria quem tem conta.
 */
@Service
public class EnvioEmailService {

    private static final Logger log = LoggerFactory.getLogger(EnvioEmailService.class);
    private static final String URL_BREVO = "https://api.brevo.com/v3/smtp/email";
    private static final String ASSUNTO_REDEFINICAO = "FinanceFlow — código para redefinir sua senha";
    private static final String ASSUNTO_CONFIRMACAO = "FinanceFlow — confirme sua conta";

    private final ObjectProvider<JavaMailSender> provedorEnviador;
    private final RestClient restClient;
    private final String host;
    private final String chaveBrevo;
    private final String remetente;

    public EnvioEmailService(ObjectProvider<JavaMailSender> provedorEnviador, RestClient restClient,
                             @Value("${spring.mail.host:}") String host,
                             @Value("${email.brevo-api-key:}") String chaveBrevo,
                             @Value("${email.remetente:}") String remetente) {
        this.provedorEnviador = provedorEnviador;
        this.restClient = restClient;
        this.host = host;
        this.chaveBrevo = chaveBrevo;
        this.remetente = remetente;
    }

    @Async
    public void enviarCodigoRedefinicao(String destinatario, String nome, String codigo, long minutosValidade) {
        String texto = """
                Olá, %s!

                Seu código para redefinir a senha do FinanceFlow é:

                    %s

                Ele vale por %d minutos e só pode ser usado uma vez.
                Se você não pediu isso, ignore este e-mail: sua senha continua a mesma.
                """.formatted(nome, codigo, minutosValidade);
        despachar(destinatario, nome, ASSUNTO_REDEFINICAO, texto, null,
                "código de redefinição de %s = %s".formatted(destinatario, codigo));
    }

    /** E-mail com o botão "Confirmar conta"; a versão em texto leva o link por extenso, pra quem não vê HTML. */
    @Async
    public void enviarConfirmacaoConta(String destinatario, String nome, String link, long horasValidade) {
        String texto = """
                Olá, %s!

                Falta só um passo para usar o FinanceFlow: confirme que este e-mail é seu abrindo o link abaixo.

                    %s

                O link vale por %d horas. Se você não criou uma conta no FinanceFlow, ignore este e-mail.
                """.formatted(nome, link, horasValidade);
        despachar(destinatario, nome, ASSUNTO_CONFIRMACAO, texto, htmlConfirmacao(nome, link, horasValidade),
                "link de confirmação de conta de %s = %s".formatted(destinatario, link));
    }

    // O nome vem do cadastro (texto livre), então entra escapado no HTML
    private static String htmlConfirmacao(String nome, String link, long horasValidade) {
        String nomeSeguro = HtmlUtils.htmlEscape(nome);
        String linkSeguro = HtmlUtils.htmlEscape(link);
        return """
                <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f2937">
                  <h2 style="margin:0 0 16px">FinanceFlow</h2>
                  <p>Olá, %s!</p>
                  <p>Falta só um passo para usar o FinanceFlow: confirme que este e-mail é seu.</p>
                  <p style="margin:28px 0">
                    <a href="%s" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:10px">Confirmar conta</a>
                  </p>
                  <p style="font-size:13px;color:#6b7280">O link vale por %d horas. Se o botão não funcionar, copie este endereço no navegador:<br>%s</p>
                  <p style="font-size:13px;color:#6b7280">Se você não criou uma conta no FinanceFlow, ignore este e-mail.</p>
                </div>
                """.formatted(nomeSeguro, linkSeguro, horasValidade, linkSeguro);
    }

    // html == null manda só o texto
    private void despachar(String destinatario, String nome, String assunto, String texto, String html,
                           String detalheSemConfiguracao) {
        try {
            if (!chaveBrevo.isBlank()) {
                enviarPeloBrevo(destinatario, nome, assunto, texto, html);
            } else if (!host.isBlank() && provedorEnviador.getIfAvailable() != null) {
                // Com spring.mail.host vazio o Spring ainda cria o JavaMailSender, por isso confere o host
                enviarPorSmtp(provedorEnviador.getIfAvailable(), destinatario, assunto, texto, html);
            } else {
                log.warn("e-mail não configurado (sem BREVO_API_KEY nem MAIL_HOST): {}", detalheSemConfiguracao);
            }
        } catch (RuntimeException excecao) {
            log.error("falha ao enviar o e-mail \"{}\" para {}", assunto, destinatario, excecao);
        }
    }

    // O Brevo exige um remetente verificado no painel dele (Senders), por isso o MAIL_REMETENTE é obrigatório aqui
    private void enviarPeloBrevo(String destinatario, String nome, String assunto, String texto, String html) {
        Map<String, Object> corpo = new HashMap<>();
        corpo.put("sender", Map.of("name", "FinanceFlow", "email", remetente));
        corpo.put("to", List.of(Map.of("email", destinatario, "name", nome)));
        corpo.put("subject", assunto);
        corpo.put("textContent", texto);
        if (html != null) {
            corpo.put("htmlContent", html);
        }
        restClient.post()
                .uri(URL_BREVO)
                .header("api-key", chaveBrevo)
                .contentType(MediaType.APPLICATION_JSON)
                .body(corpo)
                .retrieve()
                .toBodilessEntity();
    }

    private void enviarPorSmtp(JavaMailSender enviador, String destinatario, String assunto, String texto, String html) {
        MimeMessage mensagem = enviador.createMimeMessage();
        try {
            // multipart = true: com HTML, vai texto e HTML na mesma mensagem e o leitor escolhe
            MimeMessageHelper ajudante = new MimeMessageHelper(mensagem, true, "UTF-8");
            if (!remetente.isBlank()) {
                ajudante.setFrom(remetente);
            }
            ajudante.setTo(destinatario);
            ajudante.setSubject(assunto);
            if (html != null) {
                ajudante.setText(texto, html);
            } else {
                ajudante.setText(texto);
            }
        } catch (MessagingException excecao) {
            throw new IllegalStateException("não foi possível montar o e-mail", excecao);
        }
        enviador.send(mensagem);
    }
}
