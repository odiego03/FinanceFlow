package com.financeflow.exception;

import org.springframework.http.HttpStatus;

// Token válido de um usuário que não existe mais: 401 faz o frontend deslogar, em vez de um 500
public class UsuarioNaoAutenticadoException extends NegocioException {

    public UsuarioNaoAutenticadoException() {
        super("usuário do token não existe mais", HttpStatus.UNAUTHORIZED);
    }
}
