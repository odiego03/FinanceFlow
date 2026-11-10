package com.financeflow.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * Manda o código de redefinição de senha, pelo primeiro canal configurado:
 * 1. API HTTP do Brevo (BREVO_API_KEY): é o que funciona no Render grátis, que bloqueia as portas de SMTP;
 * 2. SMTP (MAIL_HOST, MAIL_USUARIO, MAIL_SENHA), ex: Gmail com senha de app, pra rodar local ou no Docker;
 * 3. nenhum: o código vai pro log. Só pra desenvolvimento.
 * Assíncrono: o envio demora segundos, e responder mais devagar quando o email existe revelaria quem tem conta.
 */
@Service
public class EnvioEmailService {

    private static final Logger log = LoggerFactory.getLogger(EnvioEmailService.class);
    private static final String URL_BREVO = "https://api.brevo.com/v3/smtp/email";
    private static final String ASSUNTO = "FinanceFlow — código para redefinir sua senha";

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
        try {
            if (!chaveBrevo.isBlank()) {
                enviarPeloBrevo(destinatario, nome, texto);
            } else if (!host.isBlank() && provedorEnviador.getIfAvailable() != null) {
                // Com spring.mail.host vazio o Spring ainda cria o JavaMailSender, por isso confere o host
                enviarPorSmtp(provedorEnviador.getIfAvailable(), destinatario, texto);
            } else {
                log.warn("e-mail não configurado (sem BREVO_API_KEY nem MAIL_HOST): código de redefinição de {} = {}",
                        destinatario, codigo);
            }
        } catch (RuntimeException excecao) {
            log.error("falha ao enviar o código de redefinição para {}", destinatario, excecao);
        }
    }

    // O Brevo exige um remetente verificado no painel dele (Senders), por isso o MAIL_REMETENTE é obrigatório aqui
    private void enviarPeloBrevo(String destinatario, String nome, String texto) {
        Map<String, Object> corpo = Map.of(
                "sender", Map.of("name", "FinanceFlow", "email", remetente),
                "to", List.of(Map.of("email", destinatario, "name", nome)),
                "subject", ASSUNTO,
                "textContent", texto);
        restClient.post()
                .uri(URL_BREVO)
                .header("api-key", chaveBrevo)
                .contentType(MediaType.APPLICATION_JSON)
                .body(corpo)
                .retrieve()
                .toBodilessEntity();
    }

    private void enviarPorSmtp(JavaMailSender enviador, String destinatario, String texto) {
        SimpleMailMessage mensagem = new SimpleMailMessage();
        if (!remetente.isBlank()) {
            mensagem.setFrom(remetente);
        }
        mensagem.setTo(destinatario);
        mensagem.setSubject(ASSUNTO);
        mensagem.setText(texto);
        enviador.send(mensagem);
    }
}
