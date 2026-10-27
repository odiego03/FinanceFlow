package com.financeflow.dto;

import java.time.LocalDate;
import java.util.List;

// evolucaoMensal só vem preenchida no relatório ANUAL (lista vazia no mensal)
public record RelatorioResposta(
        TipoRelatorio tipo,
        String referencia,
        LocalDate inicio,
        LocalDate fim,
        String referenciaAnterior,
        ResumoRelatorioResposta atual,
        ResumoRelatorioResposta anterior,
        List<CategoriaRelatorioResposta> despesasPorCategoria,
        List<CategoriaRelatorioResposta> receitasPorCategoria,
        List<TransacaoRelatorioResposta> maioresDespesas,
        List<EvolucaoMensalResposta> evolucaoMensal
) {
}
