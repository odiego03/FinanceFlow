package com.financeflow.exception;

import org.springframework.http.HttpStatus;

public class ContribuicaoInvalidaException extends NegocioException {

    public ContribuicaoInvalidaException(String mensagem) {
        super(mensagem, HttpStatus.BAD_REQUEST);
    }
}
