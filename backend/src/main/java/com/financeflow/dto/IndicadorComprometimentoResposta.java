package com.financeflow.dto;

import java.math.BigDecimal;

// Percentuais em relação à renda do mês (0–100+, 1 casa); null quando não houve renda no mês
public record IndicadorComprometimentoResposta(
        String mes,
        BigDecimal renda,
        BigDecimal despesasEssenciais,
        BigDecimal despesasNaoEssenciais,
        BigDecimal despesasTotais,
        BigDecimal percentualEssencial,
        BigDecimal percentualTotal,
        NivelComprometimento nivel
) {
}
