package com.financeflow.service;

import com.financeflow.dto.AporteNecessarioRequisicao;
import com.financeflow.dto.AporteNecessarioResposta;
import com.financeflow.dto.CenarioAporteResposta;
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
 * Com o IPCA de 12 meses, cada resultado também sai em dinheiro de hoje (inflação constante no prazo).
 */
@Service
public class SimulacaoService {

    static final BigDecimal PERCENTUAL_CDI_PADRAO = new BigDecimal("100");
    private static final BigDecimal CEM = new BigDecimal("100");

    private final IndicadorMercadoService indicadorMercadoService;

    public SimulacaoService(IndicadorMercadoService indicadorMercadoService) {
        this.indicadorMercadoService = indicadorMercadoService;
    }

    // Um investimento com a taxa mensal já calculada; taxaMensal null = taxa indisponível no BCB
    private record Produto(TipoInvestimento tipo, String nome, boolean isentoIr, BigDecimal taxaMensal) {
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
        List<Produto> produtos = produtos(taxas, percentualCdi);
        BigDecimal ipca = taxas.ipca12Meses();
        BigDecimal investidoHoje = ipca == null ? null
                : CalculadoraInvestimento.investidoEmDinheiroDeHoje(valorInicial, aporteMensal, prazo, ipca);

        List<CalculadoraInvestimento.Resultado> resultados = produtos.stream()
                .map(produto -> produto.taxaMensal() == null ? null
                        : CalculadoraInvestimento.simular(valorInicial, aporteMensal, prazo, produto.taxaMensal(), produto.isentoIr()))
                .toList();

        List<CenarioSimulacaoResposta> cenarios = new ArrayList<>();
        for (int i = 0; i < produtos.size(); i++) {
            cenarios.add(cenario(produtos.get(i), resultados.get(i), prazo, ipca, investidoHoje));
        }

        TipoInvestimento melhor = cenarios.stream()
                .filter(CenarioSimulacaoResposta::disponivel)
                .max(Comparator.comparing(CenarioSimulacaoResposta::valorLiquido))
                .map(CenarioSimulacaoResposta::tipo)
                .orElse(null);

        // A ordem de produtos() é poupança, CDB, Tesouro Selic — a mesma dos campos da evolução
        List<EvolucaoSimulacaoResposta> evolucao = new ArrayList<>();
        for (int mes = 1; mes <= prazo; mes++) {
            BigDecimal investido = valorInicial.add(aporteMensal.multiply(BigDecimal.valueOf(mes)));
            evolucao.add(new EvolucaoSimulacaoResposta(mes, investido, saldoDoMes(resultados.get(0), mes),
                    saldoDoMes(resultados.get(1), mes), saldoDoMes(resultados.get(2), mes)));
        }

        BigDecimal totalInvestido = valorInicial.add(aporteMensal.multiply(BigDecimal.valueOf(prazo)));
        return new SimulacaoResposta(taxas, percentualCdi, totalInvestido, cenarios, melhor, evolucao);
    }

    /** Modo meta: o aporte mensal que cada investimento exige pra chegar no objetivo (líquido de IR) no prazo. */
    public AporteNecessarioResposta aporteNecessario(AporteNecessarioRequisicao requisicao) {
        BigDecimal valorInicial = requisicao.valorInicial() != null ? requisicao.valorInicial() : BigDecimal.ZERO;
        BigDecimal percentualCdi = requisicao.percentualCdi() != null ? requisicao.percentualCdi() : PERCENTUAL_CDI_PADRAO;
        BigDecimal objetivo = requisicao.valorObjetivo();
        int prazo = requisicao.prazoMeses();

        TaxasInvestimentoResposta taxas = indicadorMercadoService.obterTaxasInvestimento();
        List<CenarioAporteResposta> cenarios = new ArrayList<>();
        for (Produto produto : produtos(taxas, percentualCdi)) {
            if (produto.taxaMensal() == null) {
                cenarios.add(CenarioAporteResposta.indisponivel(produto.tipo(), produto.nome(), produto.isentoIr()));
                continue;
            }
            BigDecimal aporte = CalculadoraInvestimento.aporteNecessario(valorInicial, objetivo, prazo,
                    produto.taxaMensal(), produto.isentoIr());
            CalculadoraInvestimento.Resultado resultado = CalculadoraInvestimento.simular(valorInicial, aporte, prazo,
                    produto.taxaMensal(), produto.isentoIr());
            BigDecimal valorHoje = taxas.ipca12Meses() == null ? null
                    : CalculadoraInvestimento.emDinheiroDeHoje(resultado.valorLiquido(), prazo, taxas.ipca12Meses());
            cenarios.add(new CenarioAporteResposta(produto.tipo(), produto.nome(), true, produto.isentoIr(), aporte,
                    resultado.totalInvestido(), resultado.rendimentoLiquido(), valorHoje));
        }

        TipoInvestimento melhor = cenarios.stream()
                .filter(CenarioAporteResposta::disponivel)
                .min(Comparator.comparing(CenarioAporteResposta::aporteMensal))
                .map(CenarioAporteResposta::tipo)
                .orElse(null);

        return new AporteNecessarioResposta(taxas, objetivo, prazo, cenarios, melhor);
    }

    private List<Produto> produtos(TaxasInvestimentoResposta taxas, BigDecimal percentualCdi) {
        BigDecimal mensalPoupanca = taxas.poupancaMensal() == null ? null
                : taxas.poupancaMensal().divide(CEM, MathContext.DECIMAL64);
        BigDecimal mensalCdb = taxas.cdi() == null ? null
                : CalculadoraInvestimento.taxaMensalDeAnual(taxas.cdi().multiply(percentualCdi).divide(CEM, MathContext.DECIMAL64));
        BigDecimal mensalSelic = taxas.selic() == null ? null : CalculadoraInvestimento.taxaMensalDeAnual(taxas.selic());

        return List.of(
                new Produto(TipoInvestimento.POUPANCA, "Poupança", true, mensalPoupanca),
                new Produto(TipoInvestimento.CDB, "CDB " + percentualCdi.stripTrailingZeros().toPlainString() + "% do CDI",
                        false, mensalCdb),
                new Produto(TipoInvestimento.TESOURO_SELIC, "Tesouro Selic", false, mensalSelic)
        );
    }

    private CenarioSimulacaoResposta cenario(Produto produto, CalculadoraInvestimento.Resultado resultado, int prazo,
                                             BigDecimal ipca, BigDecimal investidoHoje) {
        if (resultado == null) {
            return CenarioSimulacaoResposta.indisponivel(produto.tipo(), produto.nome(), produto.isentoIr());
        }
        BigDecimal valorHoje = ipca == null ? null
                : CalculadoraInvestimento.emDinheiroDeHoje(resultado.valorLiquido(), prazo, ipca);
        return new CenarioSimulacaoResposta(produto.tipo(), produto.nome(), true,
                CalculadoraInvestimento.percentualAnualDeMensal(produto.taxaMensal()), produto.isentoIr(),
                resultado.valorBruto(), resultado.rendimentoBruto(), resultado.impostoRenda(), resultado.valorLiquido(),
                resultado.rendimentoLiquido(), valorHoje, valorHoje == null ? null : valorHoje.subtract(investidoHoje));
    }

    private BigDecimal saldoDoMes(CalculadoraInvestimento.Resultado resultado, int mes) {
        return resultado == null ? null : resultado.saldoBrutoPorMes().get(mes - 1);
    }
}
