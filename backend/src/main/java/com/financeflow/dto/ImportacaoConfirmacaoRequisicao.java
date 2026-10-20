package com.financeflow.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record ImportacaoConfirmacaoRequisicao(
        @NotEmpty(message = "linhas é obrigatório") @Valid List<LinhaImportacaoConfirmacaoRequisicao> linhas
) {
}
