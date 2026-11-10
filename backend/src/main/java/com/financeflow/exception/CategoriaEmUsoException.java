package com.financeflow.exception;

import org.springframework.http.HttpStatus;

public class CategoriaEmUsoException extends NegocioException {

    public CategoriaEmUsoException(String acao, long quantidadeTransacoes, long quantidadeMetas) {
        super(montarMensagem(acao, quantidadeTransacoes, quantidadeMetas), HttpStatus.CONFLICT);
    }

    private static String montarMensagem(String acao, long quantidadeTransacoes, long quantidadeMetas) {
        StringBuilder uso = new StringBuilder();
        if (quantidadeTransacoes > 0) {
            uso.append(quantidadeTransacoes).append(quantidadeTransacoes == 1 ? " transação" : " transações");
        }
        if (quantidadeMetas > 0) {
            if (!uso.isEmpty()) {
                uso.append(" e ");
            }
            uso.append(quantidadeMetas).append(quantidadeMetas == 1 ? " meta" : " metas");
        }
        return "não é possível " + acao + ": a categoria está em uso por " + uso
                + ". Mova ou exclua esses registros antes.";
    }
}
