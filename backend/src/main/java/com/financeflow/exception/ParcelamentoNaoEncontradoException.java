package com.financeflow.exception;

public class ParcelamentoNaoEncontradoException extends RuntimeException {

    public ParcelamentoNaoEncontradoException(Long id) {
        super("parcelamento não encontrado: " + id);
    }
}
