package com.financeflow.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class CalculadoraInvestimentoTest {

    private static final BigDecimal UM_POR_CENTO = new BigDecimal("0.01");

    @Test
    void jurosCompostosSemIr() {
        // 1000 × 1,01^12 = 1126,825...
        CalculadoraInvestimento.Resultado resultado =
                CalculadoraInvestimento.simular(new BigDecimal("1000"), BigDecimal.ZERO, 12, UM_POR_CENTO, true);

        assertThat(resultado.valorBruto()).isEqualByComparingTo("1126.83");
        assertThat(resultado.impostoRenda()).isEqualByComparingTo("0");
        assertThat(resultado.valorLiquido()).isEqualByComparingTo("1126.83");
        assertThat(resultado.totalInvestido()).isEqualByComparingTo("1000");
        assertThat(resultado.saldoBrutoPorMes()).hasSize(12);
    }

    @Test
    void irDe20PorCentoEm12Meses() {
        // rendimento 126,825... × 20% = 25,37
        CalculadoraInvestimento.Resultado resultado =
                CalculadoraInvestimento.simular(new BigDecimal("1000"), BigDecimal.ZERO, 12, UM_POR_CENTO, false);

        assertThat(resultado.impostoRenda()).isEqualByComparingTo("25.37");
        assertThat(resultado.valorLiquido()).isEqualByComparingTo("1101.46");
        assertThat(resultado.rendimentoLiquido()).isEqualByComparingTo("101.46");
    }

    @Test
    void aporteNoFimDeCadaMesComIrPorTempoDeCadaDeposito() {
        // saldos: 100 → 201 → 303,01. IR: 1º aporte rendeu 2,01 em 2 meses, 2º rendeu 1,00 em 1 mês, 3º nada → 22,5%
        CalculadoraInvestimento.Resultado resultado =
                CalculadoraInvestimento.simular(BigDecimal.ZERO, new BigDecimal("100"), 3, UM_POR_CENTO, false);

        assertThat(resultado.saldoBrutoPorMes()).extracting(BigDecimal::toPlainString)
                .containsExactly("100.00", "201.00", "303.01");
        assertThat(resultado.totalInvestido()).isEqualByComparingTo("300");
        assertThat(resultado.impostoRenda()).isEqualByComparingTo("0.68");
    }

    @Test
    void aliquotasDoIrRegressivo() {
        assertThat(CalculadoraInvestimento.aliquotaIr(1)).isEqualByComparingTo("0.225");
        assertThat(CalculadoraInvestimento.aliquotaIr(6)).isEqualByComparingTo("0.225");
        assertThat(CalculadoraInvestimento.aliquotaIr(7)).isEqualByComparingTo("0.200");
        assertThat(CalculadoraInvestimento.aliquotaIr(12)).isEqualByComparingTo("0.200");
        assertThat(CalculadoraInvestimento.aliquotaIr(13)).isEqualByComparingTo("0.175");
        assertThat(CalculadoraInvestimento.aliquotaIr(24)).isEqualByComparingTo("0.175");
        assertThat(CalculadoraInvestimento.aliquotaIr(25)).isEqualByComparingTo("0.150");
    }

    @Test
    void conversaoEntreTaxaAnualEMensal() {
        // 12% ao ano ≈ 0,9489% ao mês, e 1% ao mês ≈ 12,68% ao ano
        assertThat(CalculadoraInvestimento.taxaMensalDeAnual(new BigDecimal("12")).doubleValue())
                .isCloseTo(0.009489, within(0.000001));
        assertThat(CalculadoraInvestimento.percentualAnualDeMensal(UM_POR_CENTO)).isEqualByComparingTo("12.68");
    }
}
