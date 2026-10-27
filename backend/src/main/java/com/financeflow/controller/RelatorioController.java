package com.financeflow.controller;

import com.financeflow.dto.RelatorioResposta;
import com.financeflow.dto.TipoRelatorio;
import com.financeflow.service.RelatorioService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/relatorios")
public class RelatorioController {

    private final RelatorioService relatorioService;

    public RelatorioController(RelatorioService relatorioService) {
        this.relatorioService = relatorioService;
    }

    @GetMapping
    public RelatorioResposta gerar(@RequestParam(defaultValue = "MENSAL") TipoRelatorio tipo,
                                   @RequestParam String referencia,
                                   Authentication autenticacao) {
        return relatorioService.gerar(autenticacao.getName(), tipo, referencia);
    }
}
