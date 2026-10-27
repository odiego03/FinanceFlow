package com.financeflow.exception;

import org.springframework.http.HttpStatus;

public class EmailJaCadastradoException extends NegocioException {

    public EmailJaCadastradoException(String email) {
        super("já existe um usuário cadastrado com o email: " + email, HttpStatus.CONFLICT);
    }
}
