package com.financeflow.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record ContribuicaoMetaRequisicao(
        @NotNull(message = "transacaoId é obrigatório") Long transacaoId,
        @NotNull(message = "valor é obrigatório") @Positive(message = "valor deve ser maior que zero") BigDecimal valor
) {
}
