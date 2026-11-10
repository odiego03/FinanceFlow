package com.financeflow.dto;

import java.math.BigDecimal;
import java.util.List;

// melhorCenario = o de menor aporte mensal entre os disponíveis
public record AporteNecessarioResposta(
        TaxasInvestimentoResposta taxas,
        BigDecimal valorObjetivo,
        int prazoMeses,
        List<CenarioAporteResposta> cenarios,
        TipoInvestimento melhorCenario
) {
}
