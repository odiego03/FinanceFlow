package com.financeflow.controller;

import com.financeflow.dto.EsqueciSenhaRequisicao;
import com.financeflow.dto.LoginRequisicao;
import com.financeflow.dto.LoginResposta;
import com.financeflow.dto.RedefinirSenhaRequisicao;
import com.financeflow.dto.VerificarCodigoRequisicao;
import com.financeflow.service.AutenticacaoService;
import com.financeflow.service.RedefinicaoSenhaService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AutenticacaoController {

    private final AutenticacaoService autenticacaoService;
    private final RedefinicaoSenhaService redefinicaoSenhaService;

    public AutenticacaoController(AutenticacaoService autenticacaoService, RedefinicaoSenhaService redefinicaoSenhaService) {
        this.autenticacaoService = autenticacaoService;
        this.redefinicaoSenhaService = redefinicaoSenhaService;
    }

    @PostMapping("/login")
    public LoginResposta login(@Valid @RequestBody LoginRequisicao requisicao) {
        return autenticacaoService.autenticar(requisicao);
    }

    // Sempre 204, exista a conta ou não
    @PostMapping("/senha/esqueci")
    public ResponseEntity<Void> esqueciSenha(@Valid @RequestBody EsqueciSenhaRequisicao requisicao) {
        redefinicaoSenhaService.solicitar(requisicao.email());
        return ResponseEntity.noContent().build();
    }

    // 204 se o código confere, o mesmo 400 de /senha/redefinir se não; não troca a senha
    @PostMapping("/senha/verificar")
    public ResponseEntity<Void> verificarCodigo(@Valid @RequestBody VerificarCodigoRequisicao requisicao) {
        redefinicaoSenhaService.verificar(requisicao);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/senha/redefinir")
    public ResponseEntity<Void> redefinirSenha(@Valid @RequestBody RedefinirSenhaRequisicao requisicao) {
        redefinicaoSenhaService.redefinir(requisicao);
        return ResponseEntity.noContent().build();
    }
}
