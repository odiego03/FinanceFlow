package com.financeflow.controller;

import com.financeflow.dto.IndicadorMercadoResposta;
import com.financeflow.service.IndicadorMercadoService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/indicadores")
public class IndicadorMercadoController {

    private final IndicadorMercadoService indicadorMercadoService;

    public IndicadorMercadoController(IndicadorMercadoService indicadorMercadoService) {
        this.indicadorMercadoService = indicadorMercadoService;
    }

    @GetMapping("/mercado")
    public IndicadorMercadoResposta obterIndicadores() {
        return indicadorMercadoService.obterIndicadores();
    }
}
