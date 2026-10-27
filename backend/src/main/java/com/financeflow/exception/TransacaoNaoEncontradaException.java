package com.financeflow.exception;

import org.springframework.http.HttpStatus;

public class TransacaoNaoEncontradaException extends NegocioException {

    public TransacaoNaoEncontradaException(Long id) {
        super("transação não encontrada: " + id, HttpStatus.NOT_FOUND);
    }
}
