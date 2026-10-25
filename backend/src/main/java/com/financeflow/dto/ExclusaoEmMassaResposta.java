package com.financeflow.dto;

import java.math.BigDecimal;

// Mesmo formato na prévia (o que seria apagado) e na exclusão (o que foi apagado)
public record ExclusaoEmMassaResposta(
        int quantidade,
        BigDecimal totalReceitas,
        BigDecimal totalDespesas,
        int contribuicoesMetas,
        BigDecimal valorContribuidoMetas,
        int parcelasMantidas
) {
}
