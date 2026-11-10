package com.financeflow.controller;

import com.financeflow.dto.SugestaoResposta;
import com.financeflow.service.SugestaoService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/sugestoes")
public class SugestaoController {

    private final SugestaoService sugestaoService;

    public SugestaoController(SugestaoService sugestaoService) {
        this.sugestaoService = sugestaoService;
    }

    @GetMapping
    public List<SugestaoResposta> listar(@RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth mes,
                                         Authentication autenticacao) {
        return sugestaoService.listar(autenticacao.getName(), mes != null ? mes : YearMonth.now());
    }
}
