package com.financeflow.exception;

import org.springframework.http.HttpStatus;

// Vira 400, não 401: o frontend trata qualquer 401 como sessão expirada e desloga
public class SenhaAtualIncorretaException extends NegocioException {

    public SenhaAtualIncorretaException() {
        super("a senha atual está incorreta", HttpStatus.BAD_REQUEST);
    }
}
