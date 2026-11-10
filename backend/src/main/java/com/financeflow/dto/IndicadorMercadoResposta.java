package com.financeflow.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record IndicadorMercadoResposta(BigDecimal selic, BigDecimal dolar, BigDecimal ibovespa,
                                        LocalDateTime atualizadoEm) {
}
