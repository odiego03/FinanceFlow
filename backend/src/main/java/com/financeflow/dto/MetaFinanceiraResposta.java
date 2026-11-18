package com.financeflow.dto;

import com.financeflow.model.Categoria;
import com.financeflow.model.MetaFinanceira;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

public record MetaFinanceiraResposta(
        Long id,
        String nome,
        BigDecimal valorAlvo,
        List<Long> categoriaIds,
        List<String> categoriaNomes,
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

        // Ordem fixa (por nome) pra tela e o JSON não mudarem de uma consulta pra outra
        List<Categoria> categorias = meta.getCategorias().stream()
                .sorted(Comparator.comparing(Categoria::getNome, String.CASE_INSENSITIVE_ORDER).thenComparing(Categoria::getId))
                .toList();

        return new MetaFinanceiraResposta(
                meta.getId(),
                meta.getNome(),
                meta.getValorAlvo(),
                categorias.stream().map(Categoria::getId).toList(),
                categorias.stream().map(Categoria::getNome).toList(),
                meta.getDataAlvo(),
                valorAtual,
                percentual,
                meta.getCriadoEm()
        );
    }
}
