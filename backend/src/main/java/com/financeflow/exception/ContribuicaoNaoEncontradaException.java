package com.financeflow.exception;

import org.springframework.http.HttpStatus;

public class ContribuicaoNaoEncontradaException extends NegocioException {

    public ContribuicaoNaoEncontradaException(Long id) {
        super("contribuição não encontrada: " + id, HttpStatus.NOT_FOUND);
    }
}
