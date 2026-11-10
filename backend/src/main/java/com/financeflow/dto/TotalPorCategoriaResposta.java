package com.financeflow.dto;

import java.math.BigDecimal;

public record TotalPorCategoriaResposta(Long categoriaId, String categoriaNome, String cor, BigDecimal total) {
}
