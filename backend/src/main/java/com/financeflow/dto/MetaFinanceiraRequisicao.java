package com.financeflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record MetaFinanceiraRequisicao(
        @NotBlank(message = "nome é obrigatório") String nome,
        @NotNull(message = "valorAlvo é obrigatório") @Positive(message = "valorAlvo deve ser maior que zero") BigDecimal valorAlvo,
        @NotNull(message = "categoriaId é obrigatório") Long categoriaId,
        LocalDate dataAlvo
) {
}
