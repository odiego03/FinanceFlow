package com.financeflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EsqueciSenhaRequisicao(
        @NotBlank(message = "email é obrigatório") @Size(max = 255, message = "email pode ter no máximo 255 caracteres") String email
) {
}
