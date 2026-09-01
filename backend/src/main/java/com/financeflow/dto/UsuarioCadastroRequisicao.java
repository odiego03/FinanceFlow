package com.financeflow.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record UsuarioCadastroRequisicao(
        @NotBlank(message = "nome é obrigatório") String nome,
        @NotBlank(message = "email é obrigatório") @Email(message = "email inválido") String email,
        @NotBlank(message = "senha é obrigatória") String senha
) {
}
