package com.financeflow.controller;

import com.financeflow.dto.IndicadorComprometimentoResposta;
import com.financeflow.service.IndicadorComprometimentoService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.YearMonth;

@RestController
@RequestMapping("/indicadores")
public class IndicadorComprometimentoController {

    private final IndicadorComprometimentoService indicadorComprometimentoService;

    public IndicadorComprometimentoController(IndicadorComprometimentoService indicadorComprometimentoService) {
        this.indicadorComprometimentoService = indicadorComprometimentoService;
    }

    @GetMapping("/comprometimento")
    public IndicadorComprometimentoResposta comprometimento(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth mes,
            Authentication autenticacao) {
        return indicadorComprometimentoService.calcular(autenticacao.getName(), mes != null ? mes : YearMonth.now());
    }
}
