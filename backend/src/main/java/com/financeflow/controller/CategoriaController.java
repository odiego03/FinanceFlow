package com.financeflow.controller;

import com.financeflow.dto.CategoriaRequisicao;
import com.financeflow.dto.CategoriaResposta;
import com.financeflow.service.CategoriaService;
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
@RequestMapping("/categorias")
public class CategoriaController {

    private final CategoriaService categoriaService;

    public CategoriaController(CategoriaService categoriaService) {
        this.categoriaService = categoriaService;
    }

    @PostMapping
    public ResponseEntity<CategoriaResposta> cadastrar(@Valid @RequestBody CategoriaRequisicao requisicao,
                                                         Authentication autenticacao) {
        CategoriaResposta resposta = categoriaService.cadastrar(requisicao, autenticacao.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(resposta);
    }

    @GetMapping
    public List<CategoriaResposta> listar(Authentication autenticacao) {
        return categoriaService.listar(autenticacao.getName());
    }

    @GetMapping("/{id}")
    public CategoriaResposta buscarPorId(@PathVariable Long id, Authentication autenticacao) {
        return categoriaService.buscarPorId(id, autenticacao.getName());
    }

    @PutMapping("/{id}")
    public CategoriaResposta atualizar(@PathVariable Long id, @Valid @RequestBody CategoriaRequisicao requisicao,
                                        Authentication autenticacao) {
        return categoriaService.atualizar(id, requisicao, autenticacao.getName());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id, Authentication autenticacao) {
        categoriaService.deletar(id, autenticacao.getName());
        return ResponseEntity.noContent().build();
    }
}
