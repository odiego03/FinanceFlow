package com.financeflow.dto;

import com.financeflow.model.Tema;

import java.math.BigDecimal;

public record PreferenciasResposta(
        boolean ocultarValores,
        BigDecimal limiteEssencial,
        BigDecimal limiteTotal,
        BigDecimal simuladorPercentualCdi,
        Integer simuladorPrazoMeses,
        Tema tema,
        boolean tutorialConcluido
) {
}
