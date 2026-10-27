package com.financeflow.exception;

import org.springframework.http.HttpStatus;

public class ParcelamentoInvalidoException extends NegocioException {

    public ParcelamentoInvalidoException(String mensagem) {
        super(mensagem, HttpStatus.BAD_REQUEST);
    }
}
