package com.financeflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record TrocaSenhaRequisicao(
        @NotBlank(message = "senhaAtual é obrigatória") String senhaAtual,
        @NotBlank(message = "novaSenha é obrigatória")
        @Pattern(regexp = RegrasValidacao.SENHA_FORTE, message = RegrasValidacao.MENSAGEM_SENHA)
        @Size(max = RegrasValidacao.SENHA_MAXIMO, message = RegrasValidacao.MENSAGEM_SENHA_MAXIMO) String novaSenha
) {
}
