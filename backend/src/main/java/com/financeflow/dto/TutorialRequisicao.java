package com.financeflow.dto;

import jakarta.validation.constraints.NotNull;

public record TutorialRequisicao(
        @NotNull(message = "concluido é obrigatório") Boolean concluido
) {
}
