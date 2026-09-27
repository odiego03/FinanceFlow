package com.financeflow.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record AporteRequisicao(
        @NotNull(message = "valor é obrigatório") @Positive(message = "valor deve ser maior que zero") BigDecimal valor,
        @NotNull(message = "data é obrigatória") LocalDate data
) {
}
