package com.financeflow.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Manda o código de redefinição por SMTP (MAIL_HOST, MAIL_USUARIO, MAIL_SENHA no ambiente).
 * Sem MAIL_HOST o código vai pro log: serve pra rodar localmente sem conta de
 * e-mail, mas em produção o SMTP tem que estar configurado.
 * Assíncrono: o SMTP demora segundos, e responder mais devagar quando o email existe revelaria quem tem conta.
 */
@Service
public class EnvioEmailService {

    private static final Logger log = LoggerFactory.getLogger(EnvioEmailService.class);

    private final ObjectProvider<JavaMailSender> provedorEnviador;
    private final String host;
    private final String remetente;

    public EnvioEmailService(ObjectProvider<JavaMailSender> provedorEnviador,
                             @Value("${spring.mail.host:}") String host,
                             @Value("${email.remetente:}") String remetente) {
        this.provedorEnviador = provedorEnviador;
        this.host = host;
        this.remetente = remetente;
    }

    @Async
    public void enviarCodigoRedefinicao(String destinatario, String nome, String codigo, long minutosValidade) {
        // Com spring.mail.host vazio o Spring ainda cria o JavaMailSender, por isso confere o host aqui
        JavaMailSender enviador = host.isBlank() ? null : provedorEnviador.getIfAvailable();
        if (enviador == null) {
            log.warn("SMTP não configurado (MAIL_HOST vazio): código de redefinição de {} = {}", destinatario, codigo);
            return;
        }

        SimpleMailMessage mensagem = new SimpleMailMessage();
        if (!remetente.isBlank()) {
            mensagem.setFrom(remetente);
        }
        mensagem.setTo(destinatario);
        mensagem.setSubject("FinanceFlow — código para redefinir sua senha");
        mensagem.setText("""
                Olá, %s!

                Seu código para redefinir a senha do FinanceFlow é:

                    %s

                Ele vale por %d minutos e só pode ser usado uma vez.
                Se você não pediu isso, ignore este e-mail: sua senha continua a mesma.
                """.formatted(nome, codigo, minutosValidade));
        try {
            enviador.send(mensagem);
        } catch (RuntimeException excecao) {
            log.error("falha ao enviar o código de redefinição para {}", destinatario, excecao);
        }
    }
}
