package com.financeflow.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record MetaFinanceiraRequisicao(
        @NotBlank(message = "nome é obrigatório") @Size(max = 100, message = "nome pode ter no máximo 100 caracteres") String nome,
        @NotNull(message = "valorAlvo é obrigatório") @Positive(message = "valorAlvo deve ser maior que zero")
        @DecimalMax(value = "99999999.99", message = "valorAlvo não pode passar de 99.999.999,99") BigDecimal valorAlvo,
        @NotNull(message = "categoriaId é obrigatório") Long categoriaId,
        LocalDate dataAlvo
) {
}
