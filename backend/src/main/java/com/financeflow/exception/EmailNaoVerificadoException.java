package com.financeflow.exception;

import org.springframework.http.HttpStatus;

// 403, não 401: o frontend trata qualquer 401 de rota autenticada como sessão expirada. Só sai depois de a senha
// conferir, então não revela a quem não sabe a senha se a conta existe nem se foi confirmada
public class EmailNaoVerificadoException extends NegocioException {

    public EmailNaoVerificadoException() {
        super("confirme seu e-mail para entrar: abra o e-mail de confirmação que enviamos ou peça um novo",
                HttpStatus.FORBIDDEN);
    }
}
