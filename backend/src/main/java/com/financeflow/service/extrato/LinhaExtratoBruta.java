package com.financeflow.service.extrato;

import java.math.BigDecimal;
import java.time.LocalDate;

public record LinhaExtratoBruta(LocalDate data, String descricao, BigDecimal valorComSinal) {
}
