package com.financeflow.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequisicao(
        @NotBlank(message = "email é obrigatório") String email,
        @NotBlank(message = "senha é obrigatória") String senha
) {
}
