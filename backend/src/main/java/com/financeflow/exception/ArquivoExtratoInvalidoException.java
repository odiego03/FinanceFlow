package com.financeflow.exception;

import org.springframework.http.HttpStatus;

public class ArquivoExtratoInvalidoException extends NegocioException {

    public ArquivoExtratoInvalidoException(String mensagem) {
        super(mensagem, HttpStatus.BAD_REQUEST);
    }
}
