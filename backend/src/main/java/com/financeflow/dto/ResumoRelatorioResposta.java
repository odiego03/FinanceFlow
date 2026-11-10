package com.financeflow.dto;

import java.math.BigDecimal;

// taxaPoupanca = saldo ÷ receitas, em %; null quando não houve receita
public record ResumoRelatorioResposta(
        BigDecimal receitas,
        BigDecimal despesas,
        BigDecimal saldo,
        BigDecimal taxaPoupanca,
        int quantidadeTransacoes
) {
}
