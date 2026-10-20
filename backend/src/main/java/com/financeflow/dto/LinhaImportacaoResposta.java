package com.financeflow.dto;

import com.financeflow.model.TipoMovimentacao;

import java.math.BigDecimal;
import java.time.LocalDate;

public record LinhaImportacaoResposta(
        LocalDate data,
        String descricao,
        String identificador,
        String chave,
        BigDecimal valor,
        TipoMovimentacao tipo,
        Long categoriaIdSugerida,
        String categoriaNomeSugerida,
        OrigemSugestaoCategoria origemSugestao,
        boolean duplicada
) {
}
