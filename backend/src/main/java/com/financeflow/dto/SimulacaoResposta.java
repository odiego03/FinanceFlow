package com.financeflow.dto;

import java.math.BigDecimal;
import java.util.List;

// melhorCenario = maior valor líquido entre os disponíveis; null se nenhum estiver
public record SimulacaoResposta(
        TaxasInvestimentoResposta taxas,
        BigDecimal percentualCdi,
        BigDecimal totalInvestido,
        List<CenarioSimulacaoResposta> cenarios,
        TipoInvestimento melhorCenario,
        List<EvolucaoSimulacaoResposta> evolucao
) {
}
