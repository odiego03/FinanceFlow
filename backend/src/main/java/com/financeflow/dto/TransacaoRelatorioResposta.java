package com.financeflow.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TransacaoRelatorioResposta(LocalDate data, String descricao, String categoriaNome, BigDecimal valor) {
}
