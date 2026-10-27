package com.financeflow.exception;

public class CategoriaNaoEncontradaException extends RuntimeException {

    public CategoriaNaoEncontradaException(Long id) {
        super("categoria não encontrada: " + id);
    }
}
