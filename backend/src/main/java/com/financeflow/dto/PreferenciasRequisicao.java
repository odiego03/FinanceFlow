package com.financeflow.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

// Limites em % da renda; a regra "essencial < total" é validada no Service
public record PreferenciasRequisicao(
        @NotNull(message = "ocultarValores é obrigatório") Boolean ocultarValores,
        @NotNull(message = "limiteEssencial é obrigatório")
        @DecimalMin(value = "20", message = "limiteEssencial deve ser no mínimo 20")
        @DecimalMax(value = "90", message = "limiteEssencial deve ser no máximo 90") BigDecimal limiteEssencial,
        @NotNull(message = "limiteTotal é obrigatório")
        @DecimalMin(value = "30", message = "limiteTotal deve ser no mínimo 30")
        @DecimalMax(value = "100", message = "limiteTotal deve ser no máximo 100") BigDecimal limiteTotal,
        @NotNull(message = "simuladorPercentualCdi é obrigatório")
        @DecimalMin(value = "50", message = "simuladorPercentualCdi deve ser no mínimo 50")
        @DecimalMax(value = "200", message = "simuladorPercentualCdi deve ser no máximo 200") BigDecimal simuladorPercentualCdi,
        @NotNull(message = "simuladorPrazoMeses é obrigatório")
        @Min(value = 1, message = "simuladorPrazoMeses deve ser no mínimo 1")
        @Max(value = 360, message = "simuladorPrazoMeses deve ser no máximo 360") Integer simuladorPrazoMeses
) {
}
