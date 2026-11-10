package com.financeflow.dto;

import java.math.BigDecimal;

// percentual = fatia do total do tipo no período; variacao = % sobre o período anterior (null se lá era zero)
public record CategoriaRelatorioResposta(
        Long categoriaId,
        String categoriaNome,
        String cor,
        BigDecimal total,
        BigDecimal percentual,
        BigDecimal totalAnterior,
        BigDecimal variacao
) {
}
