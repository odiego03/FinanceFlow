package com.financeflow.dto;

import java.math.BigDecimal;

// disponivel = false quando a taxa do cenário não veio do BCB; aí os valores vêm null.
// valorLiquidoHoje e rendimentoReal descontam a inflação (IPCA 12 meses); vêm null sem o IPCA.
// rendimentoReal negativo = o investimento perde da inflação
public record CenarioSimulacaoResposta(
        TipoInvestimento tipo,
        String nome,
        boolean disponivel,
        BigDecimal taxaAnual,
        boolean isentoIr,
        BigDecimal valorBruto,
        BigDecimal rendimentoBruto,
        BigDecimal impostoRenda,
        BigDecimal valorLiquido,
        BigDecimal rendimentoLiquido,
        BigDecimal valorLiquidoHoje,
        BigDecimal rendimentoReal
) {

    public static CenarioSimulacaoResposta indisponivel(TipoInvestimento tipo, String nome, boolean isentoIr) {
        return new CenarioSimulacaoResposta(tipo, nome, false, null, isentoIr, null, null, null, null, null, null, null);
    }
}
