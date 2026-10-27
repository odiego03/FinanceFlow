package com.financeflow.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * RN004: divide o valor total em parcelas iguais e sugere a menor quantidade de parcelas
 * cuja parcela cabe na margem livre mensal do usuário.
 */
public final class CalculadoraParcelamento {

    public static final int MINIMO_PARCELAS = 2;
    public static final int MAXIMO_PARCELAS = 60;

    private CalculadoraParcelamento() {
    }

    // Parcelas arredondadas pra baixo; os centavos que sobram vão na última, pra soma bater com o total
    public static List<BigDecimal> dividir(BigDecimal valorTotal, int quantidade) {
        BigDecimal parcela = valorTotal.divide(BigDecimal.valueOf(quantidade), 2, RoundingMode.DOWN);
        BigDecimal ultima = valorTotal.subtract(parcela.multiply(BigDecimal.valueOf(quantidade - 1)));

        List<BigDecimal> parcelas = new ArrayList<>();
        for (int i = 1; i < quantidade; i++) {
            parcelas.add(parcela);
        }
        parcelas.add(ultima);
        return parcelas;
    }

    // A última parcela é a maior (leva os centavos), então é ela que precisa caber na margem
    public static Integer quantidadeMinimaQueCabe(BigDecimal valorTotal, BigDecimal margemLivre) {
        if (valorTotal == null || margemLivre == null || margemLivre.signum() <= 0) {
            return null;
        }
        for (int quantidade = MINIMO_PARCELAS; quantidade <= MAXIMO_PARCELAS; quantidade++) {
            List<BigDecimal> parcelas = dividir(valorTotal, quantidade);
            if (parcelas.get(parcelas.size() - 1).compareTo(margemLivre) <= 0) {
                return quantidade;
            }
        }
        return null;
    }

    public static BigDecimal mediaMensal(BigDecimal soma, int meses) {
        return soma.divide(BigDecimal.valueOf(meses), 2, RoundingMode.HALF_UP);
    }
}
