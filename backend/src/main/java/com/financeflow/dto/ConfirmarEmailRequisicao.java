package com.financeflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ConfirmarEmailRequisicao(
        @NotBlank(message = "token é obrigatório") @Size(max = 100, message = "token inválido") String token
) {
}
