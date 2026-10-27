package com.financeflow.exception;

import org.springframework.http.HttpStatus;

public class TipoIncompativelException extends NegocioException {

    public TipoIncompativelException() {
        super("o tipo da transação deve ser igual ao tipo da categoria vinculada", HttpStatus.BAD_REQUEST);
    }
}
