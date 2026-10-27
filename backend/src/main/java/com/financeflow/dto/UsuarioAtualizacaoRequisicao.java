package com.financeflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Só o nome: o email é o login (e o "dono" do token JWT), então não muda
public record UsuarioAtualizacaoRequisicao(
        @NotBlank(message = "nome é obrigatório") @Size(max = 100, message = "nome pode ter no máximo 100 caracteres") String nome
) {
}
