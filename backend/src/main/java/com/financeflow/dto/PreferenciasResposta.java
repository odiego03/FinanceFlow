package com.financeflow.dto;

import java.math.BigDecimal;

public record PreferenciasResposta(
        boolean ocultarValores,
        BigDecimal limiteEssencial,
        BigDecimal limiteTotal,
        BigDecimal simuladorPercentualCdi,
        Integer simuladorPrazoMeses
) {
}
