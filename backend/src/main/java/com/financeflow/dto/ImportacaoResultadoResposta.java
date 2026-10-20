package com.financeflow.dto;

import java.util.List;

// transacoes: as criadas nessa importação — o frontend usa pra oferecer destinar as receitas às metas
public record ImportacaoResultadoResposta(int transacoesCriadas, List<TransacaoResposta> transacoes) {
}
