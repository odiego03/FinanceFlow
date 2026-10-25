package com.financeflow.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ParcelamentoRequisicao(
        @NotNull(message = "categoriaId é obrigatório") Long categoriaId,
        // 190 pra sobrar espaço pro sufixo " (n/N)" dentro dos 200 da descrição da Transação
        @NotBlank(message = "descricao é obrigatória") @Size(max = 190, message = "descricao pode ter no máximo 190 caracteres") String descricao,
        @NotNull(message = "valorTotal é obrigatório") @Positive(message = "valorTotal deve ser maior que zero") BigDecimal valorTotal,
        @NotNull(message = "quantidadeParcelas é obrigatório")
        @Min(value = 2, message = "quantidadeParcelas deve ser no mínimo 2")
        @Max(value = 60, message = "quantidadeParcelas deve ser no máximo 60") Integer quantidadeParcelas,
        @NotNull(message = "dataPrimeiraParcela é obrigatória") LocalDate dataPrimeiraParcela
) {
}
