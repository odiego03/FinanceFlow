package com.financeflow.service;

import com.financeflow.dto.CenarioSimulacaoResposta;
import com.financeflow.dto.EvolucaoSimulacaoResposta;
import com.financeflow.dto.SimulacaoRequisicao;
import com.financeflow.dto.SimulacaoResposta;
import com.financeflow.dto.TaxasInvestimentoResposta;
import com.financeflow.dto.TipoInvestimento;
import com.financeflow.exception.SimulacaoInvalidaException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * RN005: simula três cenários com as taxas do BCB. Nada é gravado — a simulação é só um cálculo.
 * Tesouro Selic rende a Selic meta (sem taxa de custódia da B3); CDB rende um % do CDI; os dois pagam IR
 * regressivo. A poupança usa a rentabilidade mensal divulgada pelo BCB (já com a TR) e é isenta de IR.
 */
@Service
public class SimulacaoService {

    static final BigDecimal PERCENTUAL_CDI_PADRAO = new BigDecimal("100");
    private static final BigDecimal CEM = new BigDecimal("100");

    private final IndicadorMercadoService indicadorMercadoService;

    public SimulacaoService(IndicadorMercadoService indicadorMercadoService) {
        this.indicadorMercadoService = indicadorMercadoService;
    }

    public SimulacaoResposta simular(SimulacaoRequisicao requisicao) {
        BigDecimal valorInicial = requisicao.valorInicial();
        BigDecimal aporteMensal = requisicao.aporteMensal() != null ? requisicao.aporteMensal() : BigDecimal.ZERO;
        BigDecimal percentualCdi = requisicao.percentualCdi() != null ? requisicao.percentualCdi() : PERCENTUAL_CDI_PADRAO;
        int prazo = requisicao.prazoMeses();
        if (valorInicial.signum() == 0 && aporteMensal.signum() == 0) {
            throw new SimulacaoInvalidaException("informe um valor inicial ou um aporte mensal");
        }

        TaxasInvestimentoResposta taxas = indicadorMercadoService.obterTaxasInvestimento();

        BigDecimal mensalPoupanca = taxas.poupancaMensal() == null ? null
                : taxas.poupancaMensal().divide(CEM, MathContext.DECIMAL64);
        BigDecimal mensalCdb = taxas.cdi() == null ? null
                : CalculadoraInvestimento.taxaMensalDeAnual(taxas.cdi().multiply(percentualCdi).divide(CEM, MathContext.DECIMAL64));
        BigDecimal mensalSelic = taxas.selic() == null ? null : CalculadoraInvestimento.taxaMensalDeAnual(taxas.selic());

        CalculadoraInvestimento.Resultado poupanca = calcular(valorInicial, aporteMensal, prazo, mensalPoupanca, true);
        CalculadoraInvestimento.Resultado cdb = calcular(valorInicial, aporteMensal, prazo, mensalCdb, false);
        CalculadoraInvestimento.Resultado tesouro = calcular(valorInicial, aporteMensal, prazo, mensalSelic, false);

        List<CenarioSimulacaoResposta> cenarios = List.of(
                cenario(TipoInvestimento.POUPANCA, "Poupança", true, mensalPoupanca, poupanca),
                cenario(TipoInvestimento.CDB, "CDB " + percentualCdi.stripTrailingZeros().toPlainString() + "% do CDI",
                        false, mensalCdb, cdb),
                cenario(TipoInvestimento.TESOURO_SELIC, "Tesouro Selic", false, mensalSelic, tesouro)
        );

        TipoInvestimento melhor = cenarios.stream()
                .filter(CenarioSimulacaoResposta::disponivel)
                .max(Comparator.comparing(CenarioSimulacaoResposta::valorLiquido))
                .map(CenarioSimulacaoResposta::tipo)
                .orElse(null);

        List<EvolucaoSimulacaoResposta> evolucao = new ArrayList<>();
        for (int mes = 1; mes <= prazo; mes++) {
            BigDecimal investido = valorInicial.add(aporteMensal.multiply(BigDecimal.valueOf(mes)));
            evolucao.add(new EvolucaoSimulacaoResposta(mes, investido, saldoDoMes(poupanca, mes),
                    saldoDoMes(cdb, mes), saldoDoMes(tesouro, mes)));
        }

        BigDecimal totalInvestido = valorInicial.add(aporteMensal.multiply(BigDecimal.valueOf(prazo)));
        return new SimulacaoResposta(taxas, percentualCdi, totalInvestido, cenarios, melhor, evolucao);
    }

    private CalculadoraInvestimento.Resultado calcular(BigDecimal valorInicial, BigDecimal aporteMensal, int prazo,
                                                       BigDecimal taxaMensal, boolean isentoIr) {
        if (taxaMensal == null) {
            return null;
        }
        return CalculadoraInvestimento.simular(valorInicial, aporteMensal, prazo, taxaMensal, isentoIr);
    }

    private CenarioSimulacaoResposta cenario(TipoInvestimento tipo, String nome, boolean isentoIr, BigDecimal taxaMensal,
                                             CalculadoraInvestimento.Resultado resultado) {
        if (resultado == null) {
            return CenarioSimulacaoResposta.indisponivel(tipo, nome, isentoIr);
        }
        return new CenarioSimulacaoResposta(tipo, nome, true, CalculadoraInvestimento.percentualAnualDeMensal(taxaMensal),
                isentoIr, resultado.valorBruto(), resultado.rendimentoBruto(), resultado.impostoRenda(),
                resultado.valorLiquido(), resultado.rendimentoLiquido());
    }

    private BigDecimal saldoDoMes(CalculadoraInvestimento.Resultado resultado, int mes) {
        return resultado == null ? null : resultado.saldoBrutoPorMes().get(mes - 1);
    }
}
