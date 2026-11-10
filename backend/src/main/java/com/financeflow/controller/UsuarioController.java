package com.financeflow.controller;

import com.financeflow.dto.ConfirmarEmailRequisicao;
import com.financeflow.dto.PreferenciasRequisicao;
import com.financeflow.dto.PreferenciasResposta;
import com.financeflow.dto.ReenviarConfirmacaoRequisicao;
import com.financeflow.dto.TutorialRequisicao;
import com.financeflow.dto.UsuarioAtualizacaoRequisicao;
import com.financeflow.dto.UsuarioCadastroRequisicao;
import com.financeflow.dto.UsuarioResposta;
import com.financeflow.service.PreferenciasService;
import com.financeflow.service.UsuarioService;
import com.financeflow.service.VerificacaoEmailService;
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
    private final VerificacaoEmailService verificacaoEmailService;

    public UsuarioController(UsuarioService usuarioService, PreferenciasService preferenciasService,
                             VerificacaoEmailService verificacaoEmailService) {
        this.usuarioService = usuarioService;
        this.preferenciasService = preferenciasService;
        this.verificacaoEmailService = verificacaoEmailService;
    }

    @PostMapping
    public ResponseEntity<UsuarioResposta> cadastrar(@Valid @RequestBody UsuarioCadastroRequisicao requisicao) {
        UsuarioResposta resposta = usuarioService.cadastrar(requisicao);
        return ResponseEntity.status(HttpStatus.CREATED).body(resposta);
    }

    // Público: é o botão do e-mail (via página do frontend) que chama. 204 ou 400 de link inválido/expirado/já usado
    @PostMapping("/confirmar-email")
    public ResponseEntity<Void> confirmarEmail(@Valid @RequestBody ConfirmarEmailRequisicao requisicao) {
        verificacaoEmailService.confirmar(requisicao.token());
        return ResponseEntity.noContent().build();
    }

    // Público. Sempre 204, exista a conta ou não (e já confirmada ou não): não revela quem está cadastrado
    @PostMapping("/reenviar-confirmacao")
    public ResponseEntity<Void> reenviarConfirmacao(@Valid @RequestBody ReenviarConfirmacaoRequisicao requisicao) {
        verificacaoEmailService.reenviar(requisicao.email());
        return ResponseEntity.noContent().build();
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

    @GetMapping("/me/preferencias")
    public PreferenciasResposta preferencias(Authentication autenticacao) {
        return preferenciasService.buscar(autenticacao.getName());
    }

    @PutMapping("/me/preferencias")
    public PreferenciasResposta atualizarPreferencias(@Valid @RequestBody PreferenciasRequisicao requisicao,
                                                      Authentication autenticacao) {
        return preferenciasService.atualizar(requisicao, autenticacao.getName());
    }

    @PutMapping("/me/preferencias/tutorial")
    public PreferenciasResposta marcarTutorial(@Valid @RequestBody TutorialRequisicao requisicao,
                                               Authentication autenticacao) {
        return preferenciasService.marcarTutorial(requisicao.concluido(), autenticacao.getName());
    }
}
