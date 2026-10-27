package com.financeflow.dto;

import com.financeflow.model.MetaFinanceira;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record MetaFinanceiraResposta(
        Long id,
        String nome,
        BigDecimal valorAlvo,
        Long categoriaId,
        String categoriaNome,
        LocalDate dataAlvo,
        BigDecimal valorAtual,
        BigDecimal percentualConcluido,
        LocalDateTime criadoEm
) {

    public static MetaFinanceiraResposta de(MetaFinanceira meta, BigDecimal valorAtual) {
        BigDecimal percentual = valorAtual
                .divide(meta.getValorAlvo(), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .min(BigDecimal.valueOf(100));

        return new MetaFinanceiraResposta(
                meta.getId(),
                meta.getNome(),
                meta.getValorAlvo(),
                meta.getCategoria().getId(),
                meta.getCategoria().getNome(),
                meta.getDataAlvo(),
                valorAtual,
                percentual,
                meta.getCriadoEm()
        );
    }
}
