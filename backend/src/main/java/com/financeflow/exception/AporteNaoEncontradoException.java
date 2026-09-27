package com.financeflow.exception;

public class AporteNaoEncontradoException extends RuntimeException {

    public AporteNaoEncontradoException(Long id) {
        super("aporte não encontrado: " + id);
    }
}
