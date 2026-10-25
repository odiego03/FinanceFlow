package com.financeflow.controller;

import com.financeflow.dto.ParcelamentoRequisicao;
import com.financeflow.dto.ParcelamentoResposta;
import com.financeflow.dto.SugestaoParcelamentoResposta;
import com.financeflow.service.ParcelamentoService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/parcelamentos")
public class ParcelamentoController {

    private final ParcelamentoService parcelamentoService;

    public ParcelamentoController(ParcelamentoService parcelamentoService) {
        this.parcelamentoService = parcelamentoService;
    }

    @PostMapping
    public ResponseEntity<ParcelamentoResposta> cadastrar(@Valid @RequestBody ParcelamentoRequisicao requisicao,
                                                          Authentication autenticacao) {
        ParcelamentoResposta resposta = parcelamentoService.cadastrar(requisicao, autenticacao.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(resposta);
    }

    @GetMapping
    public List<ParcelamentoResposta> listar(Authentication autenticacao) {
        return parcelamentoService.listar(autenticacao.getName());
    }

    @GetMapping("/sugestao")
    public SugestaoParcelamentoResposta sugerir(
            @RequestParam(required = false) BigDecimal valorTotal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataPrimeiraParcela,
            Authentication autenticacao) {
        LocalDate primeira = dataPrimeiraParcela != null ? dataPrimeiraParcela : LocalDate.now();
        return parcelamentoService.sugerir(autenticacao.getName(), valorTotal, primeira);
    }

    @GetMapping("/{id}")
    public ParcelamentoResposta buscarPorId(@PathVariable Long id, Authentication autenticacao) {
        return parcelamentoService.buscarPorId(id, autenticacao.getName());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id, Authentication autenticacao) {
        parcelamentoService.deletar(id, autenticacao.getName());
        return ResponseEntity.noContent().build();
    }
}
