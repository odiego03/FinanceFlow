package com.financeflow.exception;

import org.springframework.http.HttpStatus;

public class PeriodoInvalidoException extends NegocioException {

    public PeriodoInvalidoException(String mensagem) {
        super(mensagem, HttpStatus.BAD_REQUEST);
    }
}
