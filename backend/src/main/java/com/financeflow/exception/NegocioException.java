package com.financeflow.exception;

import org.springframework.http.HttpStatus;

// Base das exceções de regra de negócio: cada uma já carrega o status HTTP, e o TratadorDeExcecoes tem um handler só
public abstract class NegocioException extends RuntimeException {

    private final HttpStatus status;

    protected NegocioException(String mensagem, HttpStatus status) {
        super(mensagem);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
