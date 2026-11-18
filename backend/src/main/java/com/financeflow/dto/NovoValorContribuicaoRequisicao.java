package com.financeflow.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

// Novo valor de uma contribuição que já existe (pra tirar tudo, use o DELETE)
public record NovoValorContribuicaoRequisicao(
        @NotNull(message = "valor é obrigatório") @Positive(message = "valor deve ser maior que zero")
        @DecimalMax(value = "99999999.99", message = "valor não pode passar de 99.999.999,99") BigDecimal valor
) {
}
