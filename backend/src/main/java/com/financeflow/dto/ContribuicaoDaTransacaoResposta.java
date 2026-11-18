package com.financeflow.dto;

import com.financeflow.model.ContribuicaoMeta;

import java.math.BigDecimal;

/**
 * O que uma receita já guardou numa meta. "maximo" é o maior valor que essa contribuição pode ter agora: o menor
 * entre o que a receita ainda comporta e o que falta pra meta, sem contar o valor atual dessa própria contribuição.
 */
public record ContribuicaoDaTransacaoResposta(Long id, Long metaId, String metaNome, BigDecimal valor, BigDecimal maximo) {

    public static ContribuicaoDaTransacaoResposta de(ContribuicaoMeta contribuicao, BigDecimal maximo) {
        return new ContribuicaoDaTransacaoResposta(
                contribuicao.getId(),
                contribuicao.getMeta().getId(),
                contribuicao.getMeta().getNome(),
                contribuicao.getValor(),
                maximo
        );
    }
}
