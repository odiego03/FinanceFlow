package com.financeflow.dto;

import com.financeflow.model.TipoMovimentacao;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record LinhaImportacaoConfirmacaoRequisicao(
        @NotNull(message = "data é obrigatória") LocalDate data,
        @NotBlank(message = "descricao é obrigatória") String descricao,
        @NotNull(message = "valor é obrigatório") @Positive(message = "valor deve ser maior que zero") BigDecimal valor,
        @NotNull(message = "tipo é obrigatório") TipoMovimentacao tipo,
        @NotNull(message = "categoriaId é obrigatório") Long categoriaId
) {
}
