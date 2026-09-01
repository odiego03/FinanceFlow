package com.financeflow.controller;

import com.financeflow.dto.LoginRequisicao;
import com.financeflow.dto.LoginResposta;
import com.financeflow.service.AutenticacaoService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AutenticacaoController {

    private final AutenticacaoService autenticacaoService;

    public AutenticacaoController(AutenticacaoService autenticacaoService) {
        this.autenticacaoService = autenticacaoService;
    }

    @PostMapping("/login")
    public LoginResposta login(@Valid @RequestBody LoginRequisicao requisicao) {
        return autenticacaoService.autenticar(requisicao);
    }
}
