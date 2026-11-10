package com.financeflow.dto;

import java.math.BigDecimal;

// aporteMensal = 0 quando o valor inicial sozinho já chega no objetivo. Valores null se a taxa não veio do BCB
public record CenarioAporteResposta(
        TipoInvestimento tipo,
        String nome,
        boolean disponivel,
        boolean isentoIr,
        BigDecimal aporteMensal,
        BigDecimal totalInvestido,
        BigDecimal rendimentoLiquido,
        BigDecimal valorLiquidoHoje
) {

    public static CenarioAporteResposta indisponivel(TipoInvestimento tipo, String nome, boolean isentoIr) {
        return new CenarioAporteResposta(tipo, nome, false, isentoIr, null, null, null, null);
    }
}
