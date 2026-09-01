package com.financeflow.exception;

public class CredenciaisInvalidasException extends RuntimeException {

    public CredenciaisInvalidasException() {
        super("email ou senha inválidos");
    }
}
