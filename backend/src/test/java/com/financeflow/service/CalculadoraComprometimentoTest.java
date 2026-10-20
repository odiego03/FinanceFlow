package com.financeflow.service;

import com.financeflow.dto.IndicadorComprometimentoResposta;
import com.financeflow.dto.NivelComprometimento;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.YearMonth;

import static org.assertj.core.api.Assertions.assertThat;

class CalculadoraComprometimentoTest {

    private static final YearMonth MES = YearMonth.of(2026, 9);

    private IndicadorComprometimentoResposta calcular(String renda, String essenciais, String naoEssenciais) {
        return CalculadoraComprometimento.calcular(MES, new BigDecimal(renda), new BigDecimal(essenciais),
                new BigDecimal(naoEssenciais));
    }

    @Test
    void normalAbaixoDosDoisLimites() {
        IndicadorComprometimentoResposta resposta = calcular("5000", "2000", "1000");

        assertThat(resposta.nivel()).isEqualTo(NivelComprometimento.NORMAL);
        assertThat(resposta.percentualEssencial()).isEqualByComparingTo("40.0");
        assertThat(resposta.percentualTotal()).isEqualByComparingTo("60.0");
        assertThat(resposta.despesasTotais()).isEqualByComparingTo("3000");
    }

    @Test
    void atencaoQuandoEssenciaisChegamA50PorCento() {
        assertThat(calcular("5000", "2500", "0").nivel()).isEqualTo(NivelComprometimento.ATENCAO);
    }

    @Test
    void riscoQuandoTotalChegaA80PorCento() {
        assertThat(calcular("5000", "1000", "3000").nivel()).isEqualTo(NivelComprometimento.RISCO);
    }

    @Test
    void riscoPrevaleceSobreAtencao() {
        assertThat(calcular("5000", "3000", "1500").nivel()).isEqualTo(NivelComprometimento.RISCO);
    }

    @Test
    void limiteComparaSemArredondar() {
        // 49,96% fica NORMAL, mesmo aparecendo como 50,0% na resposta
        IndicadorComprometimentoResposta resposta = calcular("10000", "4996", "0");

        assertThat(resposta.nivel()).isEqualTo(NivelComprometimento.NORMAL);
        assertThat(resposta.percentualEssencial()).isEqualByComparingTo("50.0");
    }

    @Test
    void semRendaNaoDivide() {
        IndicadorComprometimentoResposta resposta = calcular("0", "300", "200");

        assertThat(resposta.nivel()).isEqualTo(NivelComprometimento.SEM_RENDA);
        assertThat(resposta.percentualTotal()).isNull();
        assertThat(resposta.despesasTotais()).isEqualByComparingTo("500");
    }
}
