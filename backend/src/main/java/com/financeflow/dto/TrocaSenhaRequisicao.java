package com.financeflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TrocaSenhaRequisicao(
        @NotBlank(message = "senhaAtual é obrigatória") String senhaAtual,
        @NotBlank(message = "novaSenha é obrigatória") @Size(min = 6, message = "a nova senha precisa ter pelo menos 6 caracteres") String novaSenha
) {
}
