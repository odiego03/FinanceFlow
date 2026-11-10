package com.financeflow.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CalculadoraParcelamentoTest {

    private static BigDecimal somar(List<BigDecimal> parcelas) {
        return parcelas.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Test
    void divideIgualQuandoODivisaoEExata() {
        List<BigDecimal> parcelas = CalculadoraParcelamento.dividir(new BigDecimal("1200.00"), 4);

        assertThat(parcelas).hasSize(4).allSatisfy(parcela -> assertThat(parcela).isEqualByComparingTo("300.00"));
    }

    @Test
    void centavosQueSobramVaoNaUltimaParcela() {
        List<BigDecimal> parcelas = CalculadoraParcelamento.dividir(new BigDecimal("100.00"), 3);

        assertThat(parcelas.get(0)).isEqualByComparingTo("33.33");
        assertThat(parcelas.get(1)).isEqualByComparingTo("33.33");
        assertThat(parcelas.get(2)).isEqualByComparingTo("33.34");
        assertThat(somar(parcelas)).isEqualByComparingTo("100.00");
    }

    @Test
    void somaSempreBateComOTotal() {
        BigDecimal total = new BigDecimal("1999.99");
        for (int quantidade = 2; quantidade <= 60; quantidade++) {
            assertThat(somar(CalculadoraParcelamento.dividir(total, quantidade))).isEqualByComparingTo(total);
        }
    }

    @Test
    void quantidadeMinimaEhAMenorQueCabeNaMargem() {
        // 2x 600 e 3x 400 passam de 300; 4x 300 cabe
        assertThat(CalculadoraParcelamento.quantidadeMinimaQueCabe(new BigDecimal("1200"), new BigDecimal("300")))
                .isEqualTo(4);
    }

    @Test
    void quantidadeMinimaConsideraOsCentavosDaUltimaParcela() {
        // 3x de 33,33 + 33,34: a última passa de 33,33, então precisa de 4 parcelas
        assertThat(CalculadoraParcelamento.quantidadeMinimaQueCabe(new BigDecimal("100.00"), new BigDecimal("33.33")))
                .isEqualTo(4);
    }

    @Test
    void semSugestaoQuandoNaoHaMargem() {
        assertThat(CalculadoraParcelamento.quantidadeMinimaQueCabe(new BigDecimal("1000"), BigDecimal.ZERO)).isNull();
        assertThat(CalculadoraParcelamento.quantidadeMinimaQueCabe(new BigDecimal("1000"), new BigDecimal("-50"))).isNull();
        assertThat(CalculadoraParcelamento.quantidadeMinimaQueCabe(new BigDecimal("1000"), null)).isNull();
    }

    @Test
    void semSugestaoQuandoNemEmSessentaVezesCabe() {
        assertThat(CalculadoraParcelamento.quantidadeMinimaQueCabe(new BigDecimal("6100"), new BigDecimal("100")))
                .isNull();
    }
}
