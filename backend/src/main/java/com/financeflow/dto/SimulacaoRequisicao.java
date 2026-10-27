package com.financeflow.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

public record SimulacaoRequisicao(
        @NotNull(message = "valorInicial é obrigatório") @PositiveOrZero(message = "valorInicial não pode ser negativo")
        @DecimalMax(value = "99999999.99", message = "valorInicial não pode passar de 99.999.999,99") BigDecimal valorInicial,
        @PositiveOrZero(message = "aporteMensal não pode ser negativo")
        @DecimalMax(value = "99999999.99", message = "aporteMensal não pode passar de 99.999.999,99") BigDecimal aporteMensal,
        @NotNull(message = "prazoMeses é obrigatório")
        @Min(value = 1, message = "prazoMeses deve ser no mínimo 1")
        @Max(value = 360, message = "prazoMeses deve ser no máximo 360") Integer prazoMeses,
        // Rentabilidade do CDB em % do CDI; padrão 100
        @DecimalMin(value = "50", message = "percentualCdi deve ser no mínimo 50")
        @DecimalMax(value = "200", message = "percentualCdi deve ser no máximo 200") BigDecimal percentualCdi
) {
}
