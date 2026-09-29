package com.financeflow.controller;

import com.financeflow.dto.ContribuicaoMetaRequisicao;
import com.financeflow.dto.ContribuicaoMetaResposta;
import com.financeflow.dto.MetaFinanceiraRequisicao;
import com.financeflow.dto.MetaFinanceiraResposta;
import com.financeflow.service.MetaFinanceiraService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/metas")
public class MetaFinanceiraController {

    private final MetaFinanceiraService metaFinanceiraService;

    public MetaFinanceiraController(MetaFinanceiraService metaFinanceiraService) {
        this.metaFinanceiraService = metaFinanceiraService;
    }

    @PostMapping
    public ResponseEntity<MetaFinanceiraResposta> cadastrar(@Valid @RequestBody MetaFinanceiraRequisicao requisicao,
                                                              Authentication autenticacao) {
        MetaFinanceiraResposta resposta = metaFinanceiraService.cadastrar(requisicao, autenticacao.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(resposta);
    }

    @GetMapping
    public List<MetaFinanceiraResposta> listar(Authentication autenticacao) {
        return metaFinanceiraService.listar(autenticacao.getName());
    }

    @GetMapping("/{id}")
    public MetaFinanceiraResposta buscarPorId(@PathVariable Long id, Authentication autenticacao) {
        return metaFinanceiraService.buscarPorId(id, autenticacao.getName());
    }

    @PutMapping("/{id}")
    public MetaFinanceiraResposta atualizar(@PathVariable Long id, @Valid @RequestBody MetaFinanceiraRequisicao requisicao,
                                             Authentication autenticacao) {
        return metaFinanceiraService.atualizar(id, requisicao, autenticacao.getName());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id, Authentication autenticacao) {
        metaFinanceiraService.deletar(id, autenticacao.getName());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/contribuicoes")
    public ResponseEntity<ContribuicaoMetaResposta> registrarContribuicao(@PathVariable Long id,
                                                                            @Valid @RequestBody ContribuicaoMetaRequisicao requisicao,
                                                                            Authentication autenticacao) {
        ContribuicaoMetaResposta resposta = metaFinanceiraService.registrarContribuicao(id, requisicao, autenticacao.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(resposta);
    }
}
