package com.financeflow.exception;

import org.springframework.http.HttpStatus;

// Mesma mensagem pra email sem conta, código errado, expirado ou esgotado: não revela qual foi o caso
public class CodigoRedefinicaoInvalidoException extends NegocioException {

    public CodigoRedefinicaoInvalidoException() {
        super("código inválido ou expirado — peça um novo", HttpStatus.BAD_REQUEST);
    }
}
