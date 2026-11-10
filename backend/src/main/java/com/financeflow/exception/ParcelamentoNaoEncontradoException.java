package com.financeflow.exception;

import org.springframework.http.HttpStatus;

public class ParcelamentoNaoEncontradoException extends NegocioException {

    public ParcelamentoNaoEncontradoException(Long id) {
        super("parcelamento não encontrado: " + id, HttpStatus.NOT_FOUND);
    }
}
