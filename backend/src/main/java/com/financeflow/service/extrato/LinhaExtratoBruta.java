package com.financeflow.service.extrato;

import java.math.BigDecimal;
import java.time.LocalDate;

// identificador: id do lançamento no banco quando o extrato traz um (Nubank); null quando não traz (Itaú)
public record LinhaExtratoBruta(LocalDate data, String descricao, BigDecimal valorComSinal, String identificador) {
}
