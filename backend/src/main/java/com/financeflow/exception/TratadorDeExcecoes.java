package com.financeflow.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class TratadorDeExcecoes {

    private static final Logger log = LoggerFactory.getLogger(TratadorDeExcecoes.class);

    @ExceptionHandler(NegocioException.class)
    public ResponseEntity<Map<String, String>> tratarNegocio(NegocioException excecao) {
        return resposta(excecao.getStatus(), excecao.getMessage());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> tratarCorpoInvalido(HttpMessageNotReadableException excecao) {
        return resposta(HttpStatus.BAD_REQUEST, "corpo da requisição inválido");
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, String>> tratarParametroInvalido(MethodArgumentTypeMismatchException excecao) {
        return resposta(HttpStatus.BAD_REQUEST, "parâmetro inválido: " + excecao.getName());
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, String>> tratarParametroAusente(MissingServletRequestParameterException excecao) {
        return resposta(HttpStatus.BAD_REQUEST, "parâmetro obrigatório: " + excecao.getParameterName());
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<Map<String, String>> tratarArquivoAusente(MissingServletRequestPartException excecao) {
        return resposta(HttpStatus.BAD_REQUEST, "arquivo obrigatório: " + excecao.getRequestPartName());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, String>> tratarArquivoGrande(MaxUploadSizeExceededException excecao) {
        return resposta(HttpStatus.PAYLOAD_TOO_LARGE, "o arquivo passa do limite de 5MB");
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, String>> tratarRotaInexistente(NoResourceFoundException excecao) {
        return resposta(HttpStatus.NOT_FOUND, "recurso não encontrado: /" + excecao.getResourcePath());
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, String>> tratarMetodoNaoSuportado(HttpRequestMethodNotSupportedException excecao) {
        return resposta(HttpStatus.METHOD_NOT_ALLOWED, "método não suportado: " + excecao.getMethod());
    }

    // Normalmente uma corrida que as validações do Service não pegam (ex: dois cadastros com o mesmo email ao mesmo tempo)
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> tratarIntegridade(DataIntegrityViolationException excecao) {
        log.warn("violação de integridade no banco: {}", excecao.getMostSpecificCause().getMessage());
        return resposta(HttpStatus.CONFLICT, "os dados enviados conflitam com um registro existente");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> tratarValidacao(MethodArgumentNotValidException excecao) {
        Map<String, String> erros = new HashMap<>();
        for (FieldError erro : excecao.getBindingResult().getFieldErrors()) {
            erros.put(erro.getField(), erro.getDefaultMessage());
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(erros);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> tratarErroInesperado(Exception excecao) {
        log.error("erro inesperado", excecao);
        return resposta(HttpStatus.INTERNAL_SERVER_ERROR, "erro inesperado no servidor");
    }

    private ResponseEntity<Map<String, String>> resposta(HttpStatus status, String mensagem) {
        return ResponseEntity.status(status).body(Map.of("mensagem", mensagem));
    }
}
