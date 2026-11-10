package com.financeflow.exception;

import org.springframework.http.HttpStatus;

// Mesma mensagem pra link inexistente, expirado ou já usado: não revela qual foi o caso
public class TokenVerificacaoInvalidoException extends NegocioException {

    public TokenVerificacaoInvalidoException() {
        super("link de confirmação inválido ou expirado — peça um novo e-mail de confirmação", HttpStatus.BAD_REQUEST);
    }
}
