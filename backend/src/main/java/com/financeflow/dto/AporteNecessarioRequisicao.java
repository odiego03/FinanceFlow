package com.financeflow.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

// Modo meta do simulador: quanto investir por mês pra ter valorObjetivo (líquido de IR) em prazoMeses
public record AporteNecessarioRequisicao(
        @NotNull(message = "valorObjetivo é obrigatório") @Positive(message = "valorObjetivo deve ser maior que zero")
        @DecimalMax(value = "99999999.99", message = "valorObjetivo não pode passar de 99.999.999,99") BigDecimal valorObjetivo,
        @PositiveOrZero(message = "valorInicial não pode ser negativo")
        @DecimalMax(value = "99999999.99", message = "valorInicial não pode passar de 99.999.999,99") BigDecimal valorInicial,
        @NotNull(message = "prazoMeses é obrigatório")
        @Min(value = 1, message = "prazoMeses deve ser no mínimo 1")
        @Max(value = 360, message = "prazoMeses deve ser no máximo 360") Integer prazoMeses,
        @DecimalMin(value = "50", message = "percentualCdi deve ser no mínimo 50")
        @DecimalMax(value = "200", message = "percentualCdi deve ser no máximo 200") BigDecimal percentualCdi
) {
}
