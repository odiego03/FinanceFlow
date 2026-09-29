package com.financeflow.dto;

import com.financeflow.model.TipoMovimentacao;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CategoriaRequisicao(
        @NotBlank(message = "nome é obrigatório") String nome,
        @NotNull(message = "tipo é obrigatório") TipoMovimentacao tipo,
        String icone,
        String cor
) {
}
