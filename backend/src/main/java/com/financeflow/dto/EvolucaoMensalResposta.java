package com.financeflow.dto;

import java.math.BigDecimal;

public record EvolucaoMensalResposta(String mes, BigDecimal totalReceitas, BigDecimal totalDespesas) {
}
