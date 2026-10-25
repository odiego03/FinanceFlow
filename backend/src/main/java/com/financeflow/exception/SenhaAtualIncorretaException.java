package com.financeflow.exception;

// Vira 400, não 401: o frontend trata qualquer 401 como sessão expirada e desloga
public class SenhaAtualIncorretaException extends RuntimeException {

    public SenhaAtualIncorretaException() {
        super("a senha atual está incorreta");
    }
}
