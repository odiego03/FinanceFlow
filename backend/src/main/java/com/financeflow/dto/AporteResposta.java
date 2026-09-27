package com.financeflow.dto;

import com.financeflow.model.Aporte;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record AporteResposta(Long id, BigDecimal valor, LocalDate data, LocalDateTime criadoEm) {

    public static AporteResposta de(Aporte aporte) {
        return new AporteResposta(aporte.getId(), aporte.getValor(), aporte.getData(), aporte.getCriadoEm());
    }
}
