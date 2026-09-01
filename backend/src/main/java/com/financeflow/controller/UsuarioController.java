package com.financeflow.controller;

import com.financeflow.dto.UsuarioCadastroRequisicao;
import com.financeflow.dto.UsuarioResposta;
import com.financeflow.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/usuarios")
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @PostMapping
    public ResponseEntity<UsuarioResposta> cadastrar(@Valid @RequestBody UsuarioCadastroRequisicao requisicao) {
        UsuarioResposta resposta = usuarioService.cadastrar(requisicao);
        return ResponseEntity.status(HttpStatus.CREATED).body(resposta);
    }
}
