package com.financeflow.service;

import com.financeflow.dto.CenarioSimulacaoResposta;
import com.financeflow.dto.IndicadorComprometimentoResposta;
import com.financeflow.dto.MetaFinanceiraResposta;
import com.financeflow.dto.ParcelamentoResposta;
import com.financeflow.dto.SeveridadeSugestao;
import com.financeflow.dto.SugestaoParcelamentoResposta;
import com.financeflow.dto.SugestaoResposta;
import com.financeflow.dto.TipoInvestimento;
import com.financeflow.dto.TipoSugestao;
import com.financeflow.dto.TotalPorCategoriaResposta;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RegrasSugestaoTest {

    private static final LocalDate HOJE = LocalDate.of(2026, 10, 25);

    private static IndicadorComprometimentoResposta indicador(String renda, String essenciais, String naoEssenciais) {
        return CalculadoraComprometimento.calcular(YearMonth.of(2026, 10), new BigDecimal(renda),
                new BigDecimal(essenciais), new BigDecimal(naoEssenciais));
    }

    private static TotalPorCategoriaResposta total(String nome, String valor) {
        return new TotalPorCategoriaResposta(1L, nome, null, new BigDecimal(valor));
    }

    private static MetaFinanceiraResposta meta(String nome, String alvo, String atual, LocalDate dataAlvo,
                                               LocalDate criadaEm) {
        BigDecimal valorAlvo = new BigDecimal(alvo);
        BigDecimal valorAtual = new BigDecimal(atual);
        BigDecimal percentual = valorAtual.multiply(new BigDecimal("100")).divide(valorAlvo, 4, java.math.RoundingMode.HALF_UP);
        return new MetaFinanceiraResposta(1L, nome, valorAlvo, 1L, "Salário", dataAlvo, valorAtual, percentual,
                criadaEm.atStartOfDay());
    }

    @Test
    void riscoMostraQuantoReduzirEAsNaoEssenciaisQueMaisPesaram() {
        // 4500 de 5000 = 90%; o limite é 4000, então reduzir 500,01 deixa abaixo de 80%
        List<TotalPorCategoriaResposta> naoEssenciais = List.of(total("Lazer", "2000"), total("Compras", "1000"),
                total("Delivery", "400"), total("Assinaturas", "100"));

        SugestaoResposta sugestao = RegrasSugestao.reduzirGastos(indicador("5000", "1000", "3500"), naoEssenciais)
                .orElseThrow();

        assertThat(sugestao.severidade()).isEqualTo(SeveridadeSugestao.ALERTA);
        assertThat(sugestao.valor()).isEqualByComparingTo("500.01");
        assertThat(sugestao.mensagem()).contains("90,0%").contains("R$ 500,01").contains("outubro de 2026");
        assertThat(sugestao.itens()).extracting("nome").containsExactly("Lazer", "Compras", "Delivery");
    }

    @Test
    void semSugestaoDeReducaoQuandoNormal() {
        assertThat(RegrasSugestao.reduzirGastos(indicador("5000", "1500", "1000"), List.of())).isEmpty();
        assertThat(RegrasSugestao.reduzirEssenciais(indicador("5000", "1500", "1000"), List.of())).isEmpty();
    }

    @Test
    void essenciaisAcimaDe50PorCentoMostraCorteOuRendaQueFalta() {
        // 3000 de 5000 = 60%: cortar 500,01 ou ter 1000,01 a mais de renda (3000 × 2 = 6000)
        SugestaoResposta sugestao = RegrasSugestao.reduzirEssenciais(indicador("5000", "3000", "0"),
                List.of(total("Moradia", "2000"), total("Saúde", "1000"))).orElseThrow();

        assertThat(sugestao.severidade()).isEqualTo(SeveridadeSugestao.ATENCAO);
        assertThat(sugestao.valor()).isEqualByComparingTo("500.01");
        assertThat(sugestao.mensagem()).contains("R$ 500,01").contains("R$ 1.000,01");
    }

    @Test
    void semRendaSoQuandoHaDespesa() {
        assertThat(RegrasSugestao.semRenda(indicador("0", "300", "0"))).get()
                .extracting(SugestaoResposta::tipo).isEqualTo(TipoSugestao.SEM_RENDA);
        assertThat(RegrasSugestao.semRenda(indicador("0", "0", "0"))).isEmpty();
    }

    @Test
    void sobraComProjecaoDoMelhorCenario() {
        CenarioSimulacaoResposta cdb = new CenarioSimulacaoResposta(TipoInvestimento.CDB, "CDB 100% do CDI", true,
                new BigDecimal("13.65"), false, new BigDecimal("25500"), new BigDecimal("1500"),
                new BigDecimal("300"), new BigDecimal("25200"), new BigDecimal("1200"), null, null);

        SugestaoResposta sugestao = RegrasSugestao.investirSobra(indicador("5000", "2000", "1000"), cdb).orElseThrow();

        assertThat(sugestao.severidade()).isEqualTo(SeveridadeSugestao.DICA);
        assertThat(sugestao.valor()).isEqualByComparingTo("2000");
        assertThat(sugestao.mensagem()).contains("R$ 2.000,00").contains("CDB 100% do CDI").contains("R$ 25.200,00");
    }

    @Test
    void sobraSemSimulacaoDisponivelAindaSugere() {
        assertThat(RegrasSugestao.investirSobra(indicador("5000", "2000", "1000"), null)).get()
                .extracting(SugestaoResposta::mensagem).asString().contains("Simulador de Investimentos");
    }

    @Test
    void semSobraNaoSugereInvestir() {
        assertThat(RegrasSugestao.investirSobra(indicador("3000", "2000", "1000"), null)).isEmpty();
    }

    @Test
    void metaVencida() {
        List<SugestaoResposta> sugestoes = RegrasSugestao.metas(
                List.of(meta("Viagem", "1000", "400", LocalDate.of(2026, 9, 30), LocalDate.of(2026, 1, 1))), HOJE);

        assertThat(sugestoes).singleElement().satisfies(sugestao -> {
            assertThat(sugestao.tipo()).isEqualTo(TipoSugestao.META_VENCIDA);
            assertThat(sugestao.valor()).isEqualByComparingTo("600");
        });
    }

    @Test
    void metaNoPrazoDivideOQueFaltaPelosMesesAteADataAlvo() {
        // outubro, novembro e dezembro: 900 / 3 = 300 por mês
        List<SugestaoResposta> sugestoes = RegrasSugestao.metas(
                List.of(meta("Notebook", "1000", "100", LocalDate.of(2026, 12, 31), LocalDate.of(2026, 10, 10))), HOJE);

        assertThat(sugestoes).singleElement().satisfies(sugestao -> {
            assertThat(sugestao.tipo()).isEqualTo(TipoSugestao.META_NO_PRAZO);
            assertThat(sugestao.valor()).isEqualByComparingTo("300");
            assertThat(sugestao.mensagem()).contains("nos próximos 3 meses");
        });
    }

    @Test
    void metaAtrasadaQuandoAbaixoDoRitmoLinear() {
        // 297 de 364 dias passados: o esperado é 1200 × 297/364 = 979,12, e só tem 100
        List<SugestaoResposta> sugestoes = RegrasSugestao.metas(
                List.of(meta("Reserva", "1200", "100", LocalDate.of(2026, 12, 31), LocalDate.of(2026, 1, 1))), HOJE);

        assertThat(sugestoes).singleElement().satisfies(sugestao -> {
            assertThat(sugestao.tipo()).isEqualTo(TipoSugestao.META_ATRASADA);
            assertThat(sugestao.mensagem()).contains("R$ 979,12");
        });
    }

    @Test
    void metaConcluidaOuSemDataNaoGeraSugestao() {
        List<MetaFinanceiraResposta> metas = List.of(
                meta("Concluída", "1000", "1000", LocalDate.of(2026, 12, 31), LocalDate.of(2026, 1, 1)),
                meta("Sem data", "1000", "100", null, LocalDate.of(2026, 1, 1)));

        assertThat(RegrasSugestao.metas(metas, HOJE)).isEmpty();
    }

    @Test
    void parcelasAcimaDaMargemLivre() {
        // renda 4000 − despesas 3500 = 500 de margem; parcelas de 800 → faltam 300
        SugestaoParcelamentoResposta margem = new SugestaoParcelamentoResposta(new BigDecimal("4000"),
                new BigDecimal("3500"), new BigDecimal("800"), new BigDecimal("-300"), null);
        ParcelamentoResposta geladeira = new ParcelamentoResposta(1L, 1L, "Compras", "Geladeira", new BigDecimal("8000"),
                10, new BigDecimal("800"), HOJE, HOJE.plusMonths(9), 1, LocalDateTime.now());

        SugestaoResposta sugestao = RegrasSugestao.parcelasAcimaDaMargem(margem, List.of(geladeira)).orElseThrow();

        assertThat(sugestao.valor()).isEqualByComparingTo("300");
        assertThat(sugestao.mensagem()).contains("R$ 800,00").contains("R$ 500,00").contains("R$ 300,00");
        assertThat(sugestao.itens()).extracting("nome").containsExactly("Geladeira (10x)");
    }

    @Test
    void parcelasDentroDaMargemNaoAlertam() {
        SugestaoParcelamentoResposta margem = new SugestaoParcelamentoResposta(new BigDecimal("4000"),
                new BigDecimal("2000"), new BigDecimal("800"), new BigDecimal("1200"), null);

        assertThat(RegrasSugestao.parcelasAcimaDaMargem(margem, List.of())).isEmpty();
    }
}
