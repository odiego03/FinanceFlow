package com.financeflow.exception;

public class CategoriaEmUsoException extends RuntimeException {

    public CategoriaEmUsoException(long quantidadeTransacoes, long quantidadeMetas) {
        super(montarMensagem(quantidadeTransacoes, quantidadeMetas));
    }

    private static String montarMensagem(long quantidadeTransacoes, long quantidadeMetas) {
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
        return "não é possível excluir: a categoria está em uso por " + uso
                + ". Mova ou exclua esses registros antes.";
    }
}
