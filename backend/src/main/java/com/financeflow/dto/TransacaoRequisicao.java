package com.financeflow.dto;

import com.financeflow.model.TipoMovimentacao;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TransacaoRequisicao(
        @NotNull(message = "categoriaId é obrigatório") Long categoriaId,
        @NotNull(message = "tipo é obrigatório") TipoMovimentacao tipo,
        @NotNull(message = "valor é obrigatório") @Positive(message = "valor deve ser maior que zero")
        @DecimalMax(value = "99999999.99", message = "valor não pode passar de 99.999.999,99") BigDecimal valor,
        @Size(max = 200, message = "descricao pode ter no máximo 200 caracteres") String descricao,
        @NotNull(message = "data é obrigatória") LocalDate data
) {
}
