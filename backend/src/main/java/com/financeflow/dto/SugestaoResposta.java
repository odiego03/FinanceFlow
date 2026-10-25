package com.financeflow.dto;

import java.math.BigDecimal;
import java.util.List;

// valor = o número principal da sugestão (quanto reduzir, quanto sobrou, quanto contribuir por mês...)
public record SugestaoResposta(
        TipoSugestao tipo,
        SeveridadeSugestao severidade,
        String titulo,
        String mensagem,
        BigDecimal valor,
        List<ItemSugestaoResposta> itens
) {
}
