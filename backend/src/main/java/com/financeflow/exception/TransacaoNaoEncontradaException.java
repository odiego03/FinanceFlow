package com.financeflow.exception;

public class TransacaoNaoEncontradaException extends RuntimeException {

    public TransacaoNaoEncontradaException(Long id) {
        super("transação não encontrada: " + id);
    }
}
