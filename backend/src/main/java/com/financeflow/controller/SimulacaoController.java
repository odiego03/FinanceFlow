package com.financeflow.controller;

import com.financeflow.dto.AporteNecessarioRequisicao;
import com.financeflow.dto.AporteNecessarioResposta;
import com.financeflow.dto.SimulacaoRequisicao;
import com.financeflow.dto.SimulacaoResposta;
import com.financeflow.dto.TaxasInvestimentoResposta;
import com.financeflow.service.IndicadorMercadoService;
import com.financeflow.service.SimulacaoService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/simulacoes")
public class SimulacaoController {

    private final SimulacaoService simulacaoService;
    private final IndicadorMercadoService indicadorMercadoService;

    public SimulacaoController(SimulacaoService simulacaoService, IndicadorMercadoService indicadorMercadoService) {
        this.simulacaoService = simulacaoService;
        this.indicadorMercadoService = indicadorMercadoService;
    }

    // 200 e não 201: a simulação é um cálculo, nada é criado
    @PostMapping
    public SimulacaoResposta simular(@Valid @RequestBody SimulacaoRequisicao requisicao) {
        return simulacaoService.simular(requisicao);
    }

    // Modo meta: quanto investir por mês em cada investimento pra chegar no valor no prazo
    @PostMapping("/aporte-necessario")
    public AporteNecessarioResposta aporteNecessario(@Valid @RequestBody AporteNecessarioRequisicao requisicao) {
        return simulacaoService.aporteNecessario(requisicao);
    }

    @GetMapping("/taxas")
    public TaxasInvestimentoResposta taxas() {
        return indicadorMercadoService.obterTaxasInvestimento();
    }
}
