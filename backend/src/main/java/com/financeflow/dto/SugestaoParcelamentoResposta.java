package com.financeflow.dto;

import java.math.BigDecimal;

// margemLivre e quantidadeMinimaParcelas vêm null quando não há renda nos meses analisados
public record SugestaoParcelamentoResposta(
        BigDecimal rendaMedia,
        BigDecimal despesasMedia,
        BigDecimal parcelasComprometidas,
        BigDecimal margemLivre,
        Integer quantidadeMinimaParcelas
) {
}
