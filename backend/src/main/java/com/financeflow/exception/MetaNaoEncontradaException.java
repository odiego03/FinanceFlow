package com.financeflow.exception;

public class MetaNaoEncontradaException extends RuntimeException {

    public MetaNaoEncontradaException(Long id) {
        super("meta financeira não encontrada: " + id);
    }
}
