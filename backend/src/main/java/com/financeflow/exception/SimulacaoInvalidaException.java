package com.financeflow.exception;

import org.springframework.http.HttpStatus;

public class SimulacaoInvalidaException extends NegocioException {

    public SimulacaoInvalidaException(String mensagem) {
        super(mensagem, HttpStatus.BAD_REQUEST);
    }
}
