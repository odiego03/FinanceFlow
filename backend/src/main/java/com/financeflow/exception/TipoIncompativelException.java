package com.financeflow.exception;

public class TipoIncompativelException extends RuntimeException {

    public TipoIncompativelException() {
        super("o tipo da transação deve ser igual ao tipo da categoria vinculada");
    }
}
