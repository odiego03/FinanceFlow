package com.financeflow.dto;

import java.math.BigDecimal;

// Saldo bruto ao fim de cada mês; cenário indisponível vem null
public record EvolucaoSimulacaoResposta(int mes, BigDecimal investido, BigDecimal poupanca, BigDecimal cdb,
                                        BigDecimal tesouroSelic) {
}
