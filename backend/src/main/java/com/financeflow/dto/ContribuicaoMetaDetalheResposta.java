package com.financeflow.dto;

import com.financeflow.model.ContribuicaoMeta;
import com.financeflow.model.Transacao;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Uma contribuição de uma meta com os dados da receita de origem. "maximo" é o maior valor que ela pode ter agora:
 * o menor entre o que a receita ainda comporta (sem contar essa contribuição) e o que falta pra meta (idem).
 */
public record ContribuicaoMetaDetalheResposta(
        Long id,
        Long transacaoId,
        String descricao,
        String categoriaNome,
        LocalDate data,
        BigDecimal valorTransacao,
        BigDecimal valor,
        BigDecimal maximo,
        LocalDateTime criadoEm
) {

    public static ContribuicaoMetaDetalheResposta de(ContribuicaoMeta contribuicao, BigDecimal maximo) {
        Transacao transacao = contribuicao.getTransacao();
        return new ContribuicaoMetaDetalheResposta(
                contribuicao.getId(),
                transacao.getId(),
                transacao.getDescricao(),
                transacao.getCategoria().getNome(),
                transacao.getData(),
                transacao.getValor(),
                contribuicao.getValor(),
                maximo,
                contribuicao.getCriadoEm()
        );
    }
}
