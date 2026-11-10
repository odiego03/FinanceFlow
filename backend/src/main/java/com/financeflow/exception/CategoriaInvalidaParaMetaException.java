package com.financeflow.exception;

import org.springframework.http.HttpStatus;

public class CategoriaInvalidaParaMetaException extends NegocioException {

    public CategoriaInvalidaParaMetaException() {
        super("a categoria vinculada a uma meta financeira deve ser do tipo RECEITA", HttpStatus.BAD_REQUEST);
    }
}
