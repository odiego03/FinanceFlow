package com.financeflow.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// selic e cdi em % ao ano; poupanca em % ao mês (já com a TR). Campo null = API do BCB indisponível e sem valor anterior
public record TaxasInvestimentoResposta(BigDecimal selic, BigDecimal cdi, BigDecimal poupancaMensal,
                                        LocalDateTime atualizadoEm) {
}
