package com.financeflow.dto;

import com.financeflow.model.TipoMovimentacao;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CategoriaRequisicao(
        @NotBlank(message = "nome é obrigatório") @Size(max = 50, message = "nome pode ter no máximo 50 caracteres") String nome,
        @NotNull(message = "tipo é obrigatório") TipoMovimentacao tipo,
        @Size(max = 50, message = "icone pode ter no máximo 50 caracteres") String icone,
        @Size(max = 20, message = "cor pode ter no máximo 20 caracteres") String cor,
        Boolean essencial
) {
}
