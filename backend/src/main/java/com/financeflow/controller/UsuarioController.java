package com.financeflow.controller;

import com.financeflow.dto.PreferenciasRequisicao;
import com.financeflow.dto.PreferenciasResposta;
import com.financeflow.dto.TrocaSenhaRequisicao;
import com.financeflow.dto.UsuarioAtualizacaoRequisicao;
import com.financeflow.dto.UsuarioCadastroRequisicao;
import com.financeflow.dto.UsuarioResposta;
import com.financeflow.service.PreferenciasService;
import com.financeflow.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/usuarios")
public class UsuarioController {

    private final UsuarioService usuarioService;
    private final PreferenciasService preferenciasService;

    public UsuarioController(UsuarioService usuarioService, PreferenciasService preferenciasService) {
        this.usuarioService = usuarioService;
        this.preferenciasService = preferenciasService;
    }

    @PostMapping
    public ResponseEntity<UsuarioResposta> cadastrar(@Valid @RequestBody UsuarioCadastroRequisicao requisicao) {
        UsuarioResposta resposta = usuarioService.cadastrar(requisicao);
        return ResponseEntity.status(HttpStatus.CREATED).body(resposta);
    }

    @GetMapping("/me")
    public UsuarioResposta meuUsuario(Authentication autenticacao) {
        return usuarioService.buscarPorEmail(autenticacao.getName());
    }

    @PutMapping("/me")
    public UsuarioResposta atualizar(@Valid @RequestBody UsuarioAtualizacaoRequisicao requisicao,
                                     Authentication autenticacao) {
        return usuarioService.atualizar(requisicao, autenticacao.getName());
    }

    @PutMapping("/me/senha")
    public ResponseEntity<Void> trocarSenha(@Valid @RequestBody TrocaSenhaRequisicao requisicao,
                                            Authentication autenticacao) {
        usuarioService.trocarSenha(requisicao, autenticacao.getName());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me/preferencias")
    public PreferenciasResposta preferencias(Authentication autenticacao) {
        return preferenciasService.buscar(autenticacao.getName());
    }

    @PutMapping("/me/preferencias")
    public PreferenciasResposta atualizarPreferencias(@Valid @RequestBody PreferenciasRequisicao requisicao,
                                                      Authentication autenticacao) {
        return preferenciasService.atualizar(requisicao, autenticacao.getName());
    }
}
