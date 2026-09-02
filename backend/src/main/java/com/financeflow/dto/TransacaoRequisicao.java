package com.financeflow.dto;

import com.financeflow.model.TipoMovimentacao;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TransacaoRequisicao(
        @NotNull(message = "categoriaId é obrigatório") Long categoriaId,
        @NotNull(message = "tipo é obrigatório") TipoMovimentacao tipo,
        @NotNull(message = "valor é obrigatório") @Positive(message = "valor deve ser maior que zero") BigDecimal valor,
        String descricao,
        @NotNull(message = "data é obrigatória") LocalDate data
) {
}
