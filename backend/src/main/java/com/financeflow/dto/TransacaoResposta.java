package com.financeflow.dto;

import com.financeflow.model.Parcelamento;
import com.financeflow.model.TipoMovimentacao;
import com.financeflow.model.Transacao;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record TransacaoResposta(
        Long id,
        Long categoriaId,
        String categoriaNome,
        TipoMovimentacao tipo,
        BigDecimal valor,
        String descricao,
        LocalDate data,
        LocalDateTime criadoEm,
        BigDecimal valorContribuidoMetas,
        Long parcelamentoId,
        Integer numeroParcela,
        Integer quantidadeParcelas
) {

    public static TransacaoResposta de(Transacao transacao, BigDecimal valorContribuidoMetas) {
        Parcelamento parcelamento = transacao.getParcelamento();
        return new TransacaoResposta(
                transacao.getId(),
                transacao.getCategoria().getId(),
                transacao.getCategoria().getNome(),
                transacao.getTipo(),
                transacao.getValor(),
                transacao.getDescricao(),
                transacao.getData(),
                transacao.getCriadoEm(),
                valorContribuidoMetas,
                parcelamento != null ? parcelamento.getId() : null,
                transacao.getNumeroParcela(),
                parcelamento != null ? parcelamento.getQuantidadeParcelas() : null
        );
    }
}
