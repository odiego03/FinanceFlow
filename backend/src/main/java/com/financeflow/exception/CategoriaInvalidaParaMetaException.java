package com.financeflow.exception;

public class CategoriaInvalidaParaMetaException extends RuntimeException {

    public CategoriaInvalidaParaMetaException() {
        super("a categoria vinculada a uma meta financeira deve ser do tipo RECEITA");
    }
}
