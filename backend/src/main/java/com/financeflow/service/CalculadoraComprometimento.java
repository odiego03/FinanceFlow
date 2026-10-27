package com.financeflow.service;

import com.financeflow.dto.IndicadorComprometimentoResposta;
import com.financeflow.dto.NivelComprometimento;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;

/**
 * Regra 50/30/20 (Warren e Tyagi): atenção quando as despesas essenciais chegam a 50% da renda do mês,
 * risco quando o total de despesas chega a 80%. Risco prevalece sobre atenção.
 */
public final class CalculadoraComprometimento {

    static final BigDecimal LIMITE_ESSENCIAL = new BigDecimal("50");
    static final BigDecimal LIMITE_TOTAL = new BigDecimal("80");
    private static final BigDecimal CEM = new BigDecimal("100");

    private CalculadoraComprometimento() {
    }

    public static IndicadorComprometimentoResposta calcular(YearMonth mes, BigDecimal renda,
                                                            BigDecimal despesasEssenciais,
                                                            BigDecimal despesasNaoEssenciais) {
        return calcular(mes, renda, despesasEssenciais, despesasNaoEssenciais, LIMITE_ESSENCIAL, LIMITE_TOTAL);
    }

    // Limites personalizados pelo usuário nas preferências (padrão: 50 e 80)
    public static IndicadorComprometimentoResposta calcular(YearMonth mes, BigDecimal renda,
                                                            BigDecimal despesasEssenciais,
                                                            BigDecimal despesasNaoEssenciais,
                                                            BigDecimal limiteEssencial, BigDecimal limiteTotal) {
        BigDecimal despesasTotais = despesasEssenciais.add(despesasNaoEssenciais);

        if (renda.signum() <= 0) {
            return new IndicadorComprometimentoResposta(mes.toString(), renda, despesasEssenciais,
                    despesasNaoEssenciais, despesasTotais, null, null, NivelComprometimento.SEM_RENDA,
                    limiteEssencial, limiteTotal);
        }

        BigDecimal percentualEssencial = percentual(despesasEssenciais, renda);
        BigDecimal percentualTotal = percentual(despesasTotais, renda);

        NivelComprometimento nivel = NivelComprometimento.NORMAL;
        if (percentualTotal.compareTo(limiteTotal) >= 0) {
            nivel = NivelComprometimento.RISCO;
        } else if (percentualEssencial.compareTo(limiteEssencial) >= 0) {
            nivel = NivelComprometimento.ATENCAO;
        }

        return new IndicadorComprometimentoResposta(mes.toString(), renda, despesasEssenciais, despesasNaoEssenciais,
                despesasTotais, paraExibicao(percentualEssencial), paraExibicao(percentualTotal), nivel,
                limiteEssencial, limiteTotal);
    }

    // Os limites comparam com 4 casas; só a resposta é arredondada, pra 49,96% não virar "50,0%" e disparar alerta
    private static BigDecimal paraExibicao(BigDecimal percentual) {
        return percentual.setScale(1, RoundingMode.HALF_UP);
    }

    private static BigDecimal percentual(BigDecimal parte, BigDecimal renda) {
        return parte.multiply(CEM).divide(renda, 4, RoundingMode.HALF_UP);
    }
}
