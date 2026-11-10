package com.financeflow.dto;

import com.financeflow.model.TipoMovimentacao;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record LinhaImportacaoConfirmacaoRequisicao(
        @NotNull(message = "data é obrigatória") LocalDate data,
        @NotBlank(message = "descricao é obrigatória") @Size(max = 200, message = "descricao pode ter no máximo 200 caracteres") String descricao,
        @NotNull(message = "valor é obrigatório") @Positive(message = "valor deve ser maior que zero")
        @DecimalMax(value = "99999999.99", message = "valor não pode passar de 99.999.999,99") BigDecimal valor,
        @NotNull(message = "tipo é obrigatório") TipoMovimentacao tipo,
        @NotNull(message = "categoriaId é obrigatório") Long categoriaId,
        @Size(max = 100, message = "identificador pode ter no máximo 100 caracteres") String identificador
) {
}
