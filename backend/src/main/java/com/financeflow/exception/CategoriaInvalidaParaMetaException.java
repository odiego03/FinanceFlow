package com.financeflow.exception;

import org.springframework.http.HttpStatus;

public class CategoriaInvalidaParaMetaException extends NegocioException {

    public CategoriaInvalidaParaMetaException() {
        super("as categorias vinculadas a uma meta financeira devem ser do tipo RECEITA", HttpStatus.BAD_REQUEST);
    }
}
