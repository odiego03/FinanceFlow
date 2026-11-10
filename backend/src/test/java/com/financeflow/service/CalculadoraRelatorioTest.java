package com.financeflow.service;

import com.financeflow.dto.CategoriaRelatorioResposta;
import com.financeflow.dto.EvolucaoMensalResposta;
import com.financeflow.dto.ResumoRelatorioResposta;
import com.financeflow.dto.TransacaoRelatorioResposta;
import com.financeflow.model.Categoria;
import com.financeflow.model.TipoMovimentacao;
import com.financeflow.model.Transacao;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CalculadoraRelatorioTest {

    private static final Categoria SALARIO = categoria(1L, "Salário", TipoMovimentacao.RECEITA);
    private static final Categoria MERCADO = categoria(2L, "Mercado", TipoMovimentacao.DESPESA);
    private static final Categoria LAZER = categoria(3L, "Lazer", TipoMovimentacao.DESPESA);
    private static final Categoria VIAGEM = categoria(4L, "Viagem", TipoMovimentacao.DESPESA);

    private static Categoria categoria(Long id, String nome, TipoMovimentacao tipo) {
        Categoria categoria = new Categoria();
        categoria.setId(id);
        categoria.setNome(nome);
        categoria.setTipo(tipo);
        return categoria;
    }

    private static Transacao transacao(Categoria categoria, String valor, String data) {
        Transacao transacao = new Transacao();
        transacao.setCategoria(categoria);
        transacao.setTipo(categoria.getTipo());
        transacao.setValor(new BigDecimal(valor));
        transacao.setData(LocalDate.parse(data));
        transacao.setDescricao(categoria.getNome());
        return transacao;
    }

    private final List<Transacao> outubro = List.of(
            transacao(SALARIO, "5000", "2026-10-05"),
            transacao(MERCADO, "1200", "2026-10-10"),
            transacao(LAZER, "300", "2026-10-15"),
            transacao(MERCADO, "500", "2026-10-20"));

    private final List<Transacao> setembro = List.of(
            transacao(SALARIO, "5000", "2026-09-05"),
            transacao(MERCADO, "1000", "2026-09-10"),
            transacao(VIAGEM, "800", "2026-09-12"));

    @Test
    void resumoComTaxaDePoupanca() {
        ResumoRelatorioResposta resumo = CalculadoraRelatorio.resumo(outubro);

        assertThat(resumo.receitas()).isEqualByComparingTo("5000");
        assertThat(resumo.despesas()).isEqualByComparingTo("2000");
        assertThat(resumo.saldo()).isEqualByComparingTo("3000");
        assertThat(resumo.taxaPoupanca()).isEqualByComparingTo("60.0");
        assertThat(resumo.quantidadeTransacoes()).isEqualTo(4);
    }

    @Test
    void resumoSemReceitaNaoTemTaxaDePoupanca() {
        assertThat(CalculadoraRelatorio.resumo(List.of(transacao(MERCADO, "100", "2026-10-01"))).taxaPoupanca()).isNull();
    }

    @Test
    void categoriasComPercentualEVariacao() {
        List<CategoriaRelatorioResposta> despesas =
                CalculadoraRelatorio.porCategoria(outubro, setembro, TipoMovimentacao.DESPESA);

        // Mercado 1700 (85% de 2000, +70% sobre 1000), Lazer 300 (sem base em setembro), Viagem 0 (−100%)
        assertThat(despesas).extracting(CategoriaRelatorioResposta::categoriaNome)
                .containsExactly("Mercado", "Lazer", "Viagem");
        CategoriaRelatorioResposta mercado = despesas.get(0);
        assertThat(mercado.total()).isEqualByComparingTo("1700");
        assertThat(mercado.percentual()).isEqualByComparingTo("85.0");
        assertThat(mercado.variacao()).isEqualByComparingTo("70.0");
        assertThat(despesas.get(1).variacao()).isNull();
        assertThat(despesas.get(2).total()).isEqualByComparingTo("0");
        assertThat(despesas.get(2).variacao()).isEqualByComparingTo("-100.0");
    }

    @Test
    void maioresDespesasDoMaiorParaOMenor() {
        List<TransacaoRelatorioResposta> maiores = CalculadoraRelatorio.maioresDespesas(outubro);

        assertThat(maiores).extracting(TransacaoRelatorioResposta::valor).extracting(BigDecimal::toPlainString)
                .containsExactly("1200", "500", "300");
    }

    @Test
    void evolucaoDoAnoTemSempreDozeMeses() {
        List<EvolucaoMensalResposta> evolucao = CalculadoraRelatorio.evolucaoDoAno(
                CalculadoraRelatorio.doPeriodo(List.copyOf(concatenar()), LocalDate.of(2026, 1, 1),
                        LocalDate.of(2026, 12, 31)), 2026);

        assertThat(evolucao).hasSize(12);
        assertThat(evolucao.get(8).mes()).isEqualTo("2026-09");
        assertThat(evolucao.get(8).totalDespesas()).isEqualByComparingTo("1800");
        assertThat(evolucao.get(9).totalReceitas()).isEqualByComparingTo("5000");
        assertThat(evolucao.get(0).totalReceitas()).isEqualByComparingTo("0");
    }

    private List<Transacao> concatenar() {
        return java.util.stream.Stream.concat(outubro.stream(), setembro.stream()).toList();
    }
}
