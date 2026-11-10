package com.financeflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RedefinirSenhaRequisicao(
        @NotBlank(message = "email é obrigatório") @Size(max = 255, message = "email pode ter no máximo 255 caracteres") String email,
        @NotBlank(message = "codigo é obrigatório") @Pattern(regexp = "^\\d{6}$", message = "o código tem 6 números") String codigo,
        @NotBlank(message = "novaSenha é obrigatória")
        @Pattern(regexp = RegrasValidacao.SENHA_FORTE, message = RegrasValidacao.MENSAGEM_SENHA)
        @Size(max = RegrasValidacao.SENHA_MAXIMO, message = RegrasValidacao.MENSAGEM_SENHA_MAXIMO) String novaSenha
) {
}
