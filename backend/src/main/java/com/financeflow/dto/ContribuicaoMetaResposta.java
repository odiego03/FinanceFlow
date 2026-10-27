package com.financeflow.dto;

import com.financeflow.model.ContribuicaoMeta;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ContribuicaoMetaResposta(Long id, Long metaId, Long transacaoId, BigDecimal valor, LocalDateTime criadoEm) {

    public static ContribuicaoMetaResposta de(ContribuicaoMeta contribuicao) {
        return new ContribuicaoMetaResposta(
                contribuicao.getId(),
                contribuicao.getMeta().getId(),
                contribuicao.getTransacao().getId(),
                contribuicao.getValor(),
                contribuicao.getCriadoEm()
        );
    }
}
