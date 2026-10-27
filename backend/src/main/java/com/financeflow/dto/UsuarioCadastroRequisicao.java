package com.financeflow.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UsuarioCadastroRequisicao(
        @NotBlank(message = "nome é obrigatório") @Size(max = 100, message = "nome pode ter no máximo 100 caracteres") String nome,
        @NotBlank(message = "email é obrigatório") @Email(message = "email inválido") @Size(max = 255, message = "email pode ter no máximo 255 caracteres") String email,
        @NotBlank(message = "senha é obrigatória") String senha
) {
}
