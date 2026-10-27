package com.financeflow.exception;

import org.springframework.http.HttpStatus;

public class CategoriaNaoEncontradaException extends NegocioException {

    public CategoriaNaoEncontradaException(Long id) {
        super("categoria não encontrada: " + id, HttpStatus.NOT_FOUND);
    }
}
