package com.financeflow.exception;

import org.springframework.http.HttpStatus;

public class CredenciaisInvalidasException extends NegocioException {

    public CredenciaisInvalidasException() {
        super("email ou senha inválidos", HttpStatus.UNAUTHORIZED);
    }
}
