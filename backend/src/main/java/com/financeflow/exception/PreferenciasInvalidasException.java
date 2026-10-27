package com.financeflow.exception;

import org.springframework.http.HttpStatus;

public class PreferenciasInvalidasException extends NegocioException {

    public PreferenciasInvalidasException(String mensagem) {
        super(mensagem, HttpStatus.BAD_REQUEST);
    }
}
