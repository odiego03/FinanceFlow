package com.financeflow.exception;

import org.springframework.http.HttpStatus;

public class MuitasTentativasLoginException extends NegocioException {

    public MuitasTentativasLoginException(long minutos) {
        super("muitas tentativas de login erradas. Tente de novo em " + minutos
                + (minutos == 1 ? " minuto" : " minutos"), HttpStatus.TOO_MANY_REQUESTS);
    }
}
