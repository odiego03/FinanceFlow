package com.financeflow.dto;

import com.financeflow.model.MetaFinanceira;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record MetaFinanceiraResposta(
        Long id,
        String nome,
        BigDecimal valorAlvo,
        Long categoriaId,
        String categoriaNome,
        LocalDate dataAlvo,
        BigDecimal valorAtual,
        BigDecimal percentualConcluido,
        LocalDateTime criadoEm,
        List<AporteResposta> aportes
) {

    public static MetaFinanceiraResposta de(MetaFinanceira meta, BigDecimal valorAtual, List<AporteResposta> aportes) {
        BigDecimal percentual = valorAtual
                .divide(meta.getValorAlvo(), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .min(BigDecimal.valueOf(100));

        return new MetaFinanceiraResposta(
                meta.getId(),
                meta.getNome(),
                meta.getValorAlvo(),
                meta.getCategoria() != null ? meta.getCategoria().getId() : null,
                meta.getCategoria() != null ? meta.getCategoria().getNome() : null,
                meta.getDataAlvo(),
                valorAtual,
                percentual,
                meta.getCriadoEm(),
                aportes
        );
    }
}
