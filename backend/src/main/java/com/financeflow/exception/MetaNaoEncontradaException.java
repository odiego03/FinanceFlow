package com.financeflow.exception;

import org.springframework.http.HttpStatus;

public class MetaNaoEncontradaException extends NegocioException {

    public MetaNaoEncontradaException(Long id) {
        super("meta financeira não encontrada: " + id, HttpStatus.NOT_FOUND);
    }
}
