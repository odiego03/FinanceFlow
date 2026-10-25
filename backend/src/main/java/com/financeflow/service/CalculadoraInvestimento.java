package com.financeflow.service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * RN005: juros compostos mês a mês, com o valor inicial aplicado no mês 0 e o aporte no fim de cada mês.
 * IR regressivo sobre o rendimento, com a alíquota de cada depósito conforme o tempo que ele ficou aplicado
 * (até 6 meses 22,5%, até 12 meses 20%, até 24 meses 17,5%, acima disso 15%).
 */
public final class CalculadoraInvestimento {

    private static final MathContext PRECISAO = MathContext.DECIMAL64;

    private CalculadoraInvestimento() {
    }

    public record Resultado(BigDecimal totalInvestido, BigDecimal valorBruto, BigDecimal impostoRenda,
                            BigDecimal valorLiquido, List<BigDecimal> saldoBrutoPorMes) {

        public BigDecimal rendimentoBruto() {
            return valorBruto.subtract(totalInvestido);
        }

        public BigDecimal rendimentoLiquido() {
            return valorLiquido.subtract(totalInvestido);
        }
    }

    // Taxa equivalente: (1 + anual)^(1/12) − 1, em fração (0,0108 = 1,08% ao mês)
    public static BigDecimal taxaMensalDeAnual(BigDecimal percentualAnual) {
        double anual = percentualAnual.doubleValue() / 100;
        return BigDecimal.valueOf(Math.pow(1 + anual, 1.0 / 12) - 1);
    }

    // Em percentual, pra exibir: (1 + mensal)^12 − 1
    public static BigDecimal percentualAnualDeMensal(BigDecimal taxaMensal) {
        double anual = Math.pow(1 + taxaMensal.doubleValue(), 12) - 1;
        return BigDecimal.valueOf(anual * 100).setScale(2, RoundingMode.HALF_UP);
    }

    public static BigDecimal aliquotaIr(int mesesAplicado) {
        if (mesesAplicado <= 6) {
            return new BigDecimal("0.225");
        }
        if (mesesAplicado <= 12) {
            return new BigDecimal("0.200");
        }
        if (mesesAplicado <= 24) {
            return new BigDecimal("0.175");
        }
        return new BigDecimal("0.150");
    }

    public static Resultado simular(BigDecimal valorInicial, BigDecimal aporteMensal, int prazoMeses,
                                    BigDecimal taxaMensal, boolean isentoIr) {
        BigDecimal fator = BigDecimal.ONE.add(taxaMensal);

        BigDecimal saldo = valorInicial;
        List<BigDecimal> saldoPorMes = new ArrayList<>();
        for (int mes = 1; mes <= prazoMeses; mes++) {
            saldo = saldo.multiply(fator, PRECISAO).add(aporteMensal);
            saldoPorMes.add(saldo.setScale(2, RoundingMode.HALF_UP));
        }

        BigDecimal impostoRenda = BigDecimal.ZERO;
        if (!isentoIr) {
            impostoRenda = impostoDoDeposito(valorInicial, prazoMeses, fator);
            for (int mes = 1; mes <= prazoMeses; mes++) {
                impostoRenda = impostoRenda.add(impostoDoDeposito(aporteMensal, prazoMeses - mes, fator));
            }
        }

        BigDecimal totalInvestido = valorInicial.add(aporteMensal.multiply(BigDecimal.valueOf(prazoMeses)));
        BigDecimal valorBruto = saldo.setScale(2, RoundingMode.HALF_UP);
        BigDecimal imposto = impostoRenda.setScale(2, RoundingMode.HALF_UP);
        return new Resultado(totalInvestido.setScale(2, RoundingMode.HALF_UP), valorBruto, imposto,
                valorBruto.subtract(imposto), saldoPorMes);
    }

    private static BigDecimal impostoDoDeposito(BigDecimal deposito, int mesesAplicado, BigDecimal fator) {
        if (deposito.signum() == 0 || mesesAplicado <= 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal rendimento = deposito.multiply(fator.pow(mesesAplicado, PRECISAO).subtract(BigDecimal.ONE), PRECISAO);
        return rendimento.multiply(aliquotaIr(mesesAplicado), PRECISAO);
    }
}
