package com.financeflow.dto;

import com.financeflow.model.Parcelamento;
import com.financeflow.service.CalculadoraParcelamento;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record ParcelamentoResposta(
        Long id,
        Long categoriaId,
        String categoriaNome,
        String descricao,
        BigDecimal valorTotal,
        Integer quantidadeParcelas,
        BigDecimal valorParcela,
        LocalDate dataPrimeiraParcela,
        LocalDate dataUltimaParcela,
        int parcelasVencidas,
        LocalDateTime criadoEm
) {

    public static ParcelamentoResposta de(Parcelamento parcelamento, LocalDate hoje) {
        int quantidade = parcelamento.getQuantidadeParcelas();
        LocalDate primeira = parcelamento.getDataPrimeiraParcela();

        int vencidas = 0;
        while (vencidas < quantidade && !primeira.plusMonths(vencidas).isAfter(hoje)) {
            vencidas++;
        }

        return new ParcelamentoResposta(
                parcelamento.getId(),
                parcelamento.getCategoria().getId(),
                parcelamento.getCategoria().getNome(),
                parcelamento.getDescricao(),
                parcelamento.getValorTotal(),
                quantidade,
                CalculadoraParcelamento.dividir(parcelamento.getValorTotal(), quantidade).get(0),
                primeira,
                primeira.plusMonths(quantidade - 1),
                vencidas,
                parcelamento.getCriadoEm()
        );
    }
}
