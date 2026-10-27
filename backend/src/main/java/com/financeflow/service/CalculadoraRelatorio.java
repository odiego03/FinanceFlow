package com.financeflow.service;

import com.financeflow.dto.CategoriaRelatorioResposta;
import com.financeflow.dto.EvolucaoMensalResposta;
import com.financeflow.dto.ResumoRelatorioResposta;
import com.financeflow.dto.TransacaoRelatorioResposta;
import com.financeflow.model.Categoria;
import com.financeflow.model.TipoMovimentacao;
import com.financeflow.model.Transacao;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Contas do relatório sobre uma lista de transações já carregada: resumo, totais por categoria comparados com
 * o período anterior, maiores despesas e evolução mês a mês. Sem banco, pra ser testável.
 */
public final class CalculadoraRelatorio {

    static final int QUANTIDADE_MAIORES_DESPESAS = 5;
    private static final BigDecimal CEM = new BigDecimal("100");

    private CalculadoraRelatorio() {
    }

    public static List<Transacao> doPeriodo(List<Transacao> transacoes, LocalDate inicio, LocalDate fim) {
        return transacoes.stream()
                .filter(t -> !t.getData().isBefore(inicio) && !t.getData().isAfter(fim))
                .toList();
    }

    public static ResumoRelatorioResposta resumo(List<Transacao> transacoes) {
        BigDecimal receitas = somar(transacoes, TipoMovimentacao.RECEITA);
        BigDecimal despesas = somar(transacoes, TipoMovimentacao.DESPESA);
        BigDecimal saldo = receitas.subtract(despesas);
        BigDecimal taxaPoupanca = receitas.signum() > 0
                ? saldo.multiply(CEM).divide(receitas, 1, RoundingMode.HALF_UP)
                : null;
        return new ResumoRelatorioResposta(receitas, despesas, saldo, taxaPoupanca, transacoes.size());
    }

    /**
     * Totais por categoria do tipo, do maior pro menor. Entram também as categorias que só aparecem no período
     * anterior (com total zero), pra mostrar o que deixou de ser gasto.
     */
    public static List<CategoriaRelatorioResposta> porCategoria(List<Transacao> atual, List<Transacao> anterior,
                                                                TipoMovimentacao tipo) {
        Map<Long, Categoria> categorias = new LinkedHashMap<>();
        Map<Long, BigDecimal> totaisAtuais = totaisPorCategoria(atual, tipo, categorias);
        Map<Long, BigDecimal> totaisAnteriores = totaisPorCategoria(anterior, tipo, categorias);
        BigDecimal totalDoTipo = somar(atual, tipo);

        List<CategoriaRelatorioResposta> linhas = new ArrayList<>();
        for (Map.Entry<Long, Categoria> entrada : categorias.entrySet()) {
            BigDecimal total = totaisAtuais.getOrDefault(entrada.getKey(), BigDecimal.ZERO);
            BigDecimal totalAnterior = totaisAnteriores.getOrDefault(entrada.getKey(), BigDecimal.ZERO);
            BigDecimal percentual = totalDoTipo.signum() > 0
                    ? total.multiply(CEM).divide(totalDoTipo, 1, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            Categoria categoria = entrada.getValue();
            linhas.add(new CategoriaRelatorioResposta(categoria.getId(), categoria.getNome(), categoria.getCor(), total,
                    percentual, totalAnterior, variacao(total, totalAnterior)));
        }
        linhas.sort(Comparator.comparing(CategoriaRelatorioResposta::total)
                .thenComparing(CategoriaRelatorioResposta::totalAnterior).reversed());
        return linhas;
    }

    public static List<TransacaoRelatorioResposta> maioresDespesas(List<Transacao> transacoes) {
        return transacoes.stream()
                .filter(t -> t.getTipo() == TipoMovimentacao.DESPESA)
                .sorted(Comparator.comparing(Transacao::getValor).reversed().thenComparing(Transacao::getData))
                .limit(QUANTIDADE_MAIORES_DESPESAS)
                .map(t -> new TransacaoRelatorioResposta(t.getData(), t.getDescricao(), t.getCategoria().getNome(),
                        t.getValor()))
                .toList();
    }

    public static List<EvolucaoMensalResposta> evolucaoDoAno(List<Transacao> doAno, int ano) {
        List<EvolucaoMensalResposta> meses = new ArrayList<>();
        for (int mes = 1; mes <= 12; mes++) {
            YearMonth anoMes = YearMonth.of(ano, mes);
            List<Transacao> doMes = doAno.stream().filter(t -> YearMonth.from(t.getData()).equals(anoMes)).toList();
            meses.add(new EvolucaoMensalResposta(anoMes.toString(), somar(doMes, TipoMovimentacao.RECEITA),
                    somar(doMes, TipoMovimentacao.DESPESA)));
        }
        return meses;
    }

    // % de mudança sobre o anterior; null quando o anterior é zero (não há base pra comparar)
    static BigDecimal variacao(BigDecimal atual, BigDecimal anterior) {
        if (anterior.signum() == 0) {
            return null;
        }
        return atual.subtract(anterior).multiply(CEM).divide(anterior, 1, RoundingMode.HALF_UP);
    }

    private static Map<Long, BigDecimal> totaisPorCategoria(List<Transacao> transacoes, TipoMovimentacao tipo,
                                                            Map<Long, Categoria> categorias) {
        Map<Long, BigDecimal> totais = new LinkedHashMap<>();
        for (Transacao transacao : transacoes) {
            if (transacao.getTipo() != tipo) {
                continue;
            }
            categorias.putIfAbsent(transacao.getCategoria().getId(), transacao.getCategoria());
            totais.merge(transacao.getCategoria().getId(), transacao.getValor(), BigDecimal::add);
        }
        return totais;
    }

    private static BigDecimal somar(List<Transacao> transacoes, TipoMovimentacao tipo) {
        return transacoes.stream()
                .filter(t -> t.getTipo() == tipo)
                .map(Transacao::getValor)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
