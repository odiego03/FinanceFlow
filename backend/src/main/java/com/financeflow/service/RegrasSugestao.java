package com.financeflow.service;

import com.financeflow.dto.CenarioSimulacaoResposta;
import com.financeflow.dto.IndicadorComprometimentoResposta;
import com.financeflow.dto.ItemSugestaoResposta;
import com.financeflow.dto.MetaFinanceiraResposta;
import com.financeflow.dto.NivelComprometimento;
import com.financeflow.dto.ParcelamentoResposta;
import com.financeflow.dto.SeveridadeSugestao;
import com.financeflow.dto.SugestaoParcelamentoResposta;
import com.financeflow.dto.SugestaoResposta;
import com.financeflow.dto.TipoSugestao;
import com.financeflow.dto.TotalPorCategoriaResposta;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * RN006: sugestões por regras fixas (sem IA), a partir do Indicador de comprometimento, da Simulação de
 * investimento, das Metas e da margem livre do Parcelamento. Cada regra devolve a sugestão pronta pra exibir.
 */
public final class RegrasSugestao {

    static final int MESES_SIMULACAO_SOBRA = 12;
    static final int MAXIMO_CATEGORIAS_LISTADAS = 3;
    // Meta recém-criada ainda não tem ritmo pra comparar
    static final int DIAS_MINIMOS_PARA_ATRASO = 30;

    private static final Locale PT_BR = Locale.forLanguageTag("pt-BR");
    private static final BigDecimal CEM = new BigDecimal("100");
    private static final BigDecimal UM_CENTAVO = new BigDecimal("0.01");
    private static final DateTimeFormatter FORMATO_DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter FORMATO_MES = DateTimeFormatter.ofPattern("MMMM 'de' yyyy", PT_BR);

    private RegrasSugestao() {
    }

    // Total ≥ limite de risco (padrão 80%): quanto cortar pra ficar abaixo, apontando as não essenciais que mais pesaram
    public static Optional<SugestaoResposta> reduzirGastos(IndicadorComprometimentoResposta indicador,
                                                           List<TotalPorCategoriaResposta> naoEssenciais) {
        if (indicador.nivel() != NivelComprometimento.RISCO) {
            return Optional.empty();
        }
        BigDecimal limite = fracao(indicador.renda(), indicador.limiteTotal());
        BigDecimal reduzir = indicador.despesasTotais().subtract(limite).add(UM_CENTAVO).setScale(2, RoundingMode.UP);

        String mensagem = "As despesas de " + mes(indicador) + " chegaram a " + percentual(indicador.percentualTotal())
                + " da renda. Para voltar abaixo de " + limite(indicador.limiteTotal()) + ", reduza pelo menos "
                + moeda(reduzir) + ".";
        mensagem += naoEssenciais.isEmpty()
                ? " Todas as despesas do mês são essenciais, então o corte precisa vir delas ou de mais renda."
                : " As despesas não essenciais que mais pesaram:";

        return Optional.of(new SugestaoResposta(TipoSugestao.REDUZIR_GASTOS, SeveridadeSugestao.ALERTA,
                "Seus gastos estão em nível de risco", mensagem, reduzir, itens(naoEssenciais)));
    }

    // Essenciais ≥ limite de atenção (padrão 50%): cortar não essencial não resolve, então mostra o corte nas
    // essenciais ou a renda que falta
    public static Optional<SugestaoResposta> reduzirEssenciais(IndicadorComprometimentoResposta indicador,
                                                               List<TotalPorCategoriaResposta> essenciais) {
        if (indicador.percentualEssencial() == null
                || indicador.percentualEssencial().compareTo(indicador.limiteEssencial()) < 0) {
            return Optional.empty();
        }
        BigDecimal limite = fracao(indicador.renda(), indicador.limiteEssencial());
        BigDecimal reduzir = indicador.despesasEssenciais().subtract(limite).add(UM_CENTAVO).setScale(2, RoundingMode.UP);
        // renda em que as essenciais ficariam no limite: essenciais × 100 / limite (com 50%, essenciais × 2)
        BigDecimal rendaQueFalta = indicador.despesasEssenciais().multiply(CEM)
                .divide(indicador.limiteEssencial(), 2, RoundingMode.UP)
                .subtract(indicador.renda()).add(UM_CENTAVO);

        String mensagem = "As despesas essenciais de " + mes(indicador) + " ocupam "
                + percentual(indicador.percentualEssencial()) + " da renda, acima do limite de "
                + limite(indicador.limiteEssencial()) + ". "
                + "Para voltar ao limite, seria preciso reduzir " + moeda(reduzir) + " nelas ou ter "
                + moeda(rendaQueFalta) + " a mais de renda. As essenciais que mais pesaram:";

        return Optional.of(new SugestaoResposta(TipoSugestao.REDUZIR_ESSENCIAIS, SeveridadeSugestao.ATENCAO,
                "Despesas essenciais acima do limite", mensagem, reduzir, itens(essenciais)));
    }

    public static Optional<SugestaoResposta> semRenda(IndicadorComprometimentoResposta indicador) {
        if (indicador.nivel() != NivelComprometimento.SEM_RENDA || indicador.despesasTotais().signum() <= 0) {
            return Optional.empty();
        }
        String mensagem = "Há " + moeda(indicador.despesasTotais()) + " em despesas em " + mes(indicador)
                + ", mas nenhuma receita. Registre suas receitas para que o comprometimento de renda e as "
                + "sugestões possam ser calculados.";
        return Optional.of(new SugestaoResposta(TipoSugestao.SEM_RENDA, SeveridadeSugestao.ATENCAO,
                "Nenhuma receita registrada no mês", mensagem, indicador.despesasTotais(), List.of()));
    }

    // melhorCenario null = simulação indisponível (taxas do BCB fora do ar); a sugestão sai sem a projeção
    public static Optional<SugestaoResposta> investirSobra(IndicadorComprometimentoResposta indicador,
                                                           CenarioSimulacaoResposta melhorCenario) {
        BigDecimal sobra = indicador.renda().subtract(indicador.despesasTotais());
        if (indicador.renda().signum() <= 0 || sobra.signum() <= 0) {
            return Optional.empty();
        }

        String mensagem = "Sobraram " + moeda(sobra) + " em " + mes(indicador) + ".";
        if (melhorCenario != null) {
            mensagem += " Investindo esse valor todo mês por " + MESES_SIMULACAO_SOBRA + " meses no "
                    + melhorCenario.nome() + ", você teria " + moeda(melhorCenario.valorLiquido()) + " líquidos ("
                    + moeda(melhorCenario.rendimentoLiquido()) + " de rendimento).";
        } else {
            mensagem += " Que tal investir a sobra? Compare as opções no Simulador de Investimentos.";
        }

        return Optional.of(new SugestaoResposta(TipoSugestao.INVESTIR_SOBRA, SeveridadeSugestao.DICA,
                "Invista o que sobrou no mês", mensagem, sobra, List.of()));
    }

    /**
     * Uma sugestão por meta com data-alvo ainda não concluída: vencida (prazo passou), atrasada (abaixo do ritmo
     * linear entre a criação e a data-alvo) ou no prazo. Nas duas últimas, quanto contribuir por mês até lá.
     */
    public static List<SugestaoResposta> metas(List<MetaFinanceiraResposta> metas, LocalDate hoje) {
        List<SugestaoResposta> sugestoes = new ArrayList<>();
        for (MetaFinanceiraResposta meta : metas) {
            BigDecimal falta = meta.valorAlvo().subtract(meta.valorAtual());
            if (meta.dataAlvo() == null || falta.signum() <= 0) {
                continue;
            }

            if (meta.dataAlvo().isBefore(hoje)) {
                String mensagem = "O prazo era " + meta.dataAlvo().format(FORMATO_DATA) + " e ainda faltam "
                        + moeda(falta) + " (" + percentual(meta.percentualConcluido()) + " concluída). "
                        + "Que tal definir uma nova data-alvo?";
                sugestoes.add(new SugestaoResposta(TipoSugestao.META_VENCIDA, SeveridadeSugestao.ALERTA,
                        "A meta \"" + meta.nome() + "\" passou do prazo", mensagem, falta, List.of()));
                continue;
            }

            long meses = ChronoUnit.MONTHS.between(YearMonth.from(hoje), YearMonth.from(meta.dataAlvo())) + 1;
            BigDecimal porMes = falta.divide(BigDecimal.valueOf(meses), 2, RoundingMode.UP);
            String contribuicao = "Para chegar lá até " + meta.dataAlvo().format(FORMATO_DATA) + ", contribua "
                    + moeda(porMes) + " por mês" + (meses > 1 ? " nos próximos " + meses + " meses." : " neste mês.");

            BigDecimal esperado = valorEsperadoPeloRitmo(meta, hoje);
            if (esperado != null && meta.valorAtual().compareTo(esperado) < 0) {
                String mensagem = "Pelo ritmo, ela já deveria ter " + moeda(esperado) + ", mas tem "
                        + moeda(meta.valorAtual()) + ". " + contribuicao;
                sugestoes.add(new SugestaoResposta(TipoSugestao.META_ATRASADA, SeveridadeSugestao.ATENCAO,
                        "A meta \"" + meta.nome() + "\" está atrasada", mensagem, porMes, List.of()));
            } else {
                sugestoes.add(new SugestaoResposta(TipoSugestao.META_NO_PRAZO, SeveridadeSugestao.DICA,
                        "A meta \"" + meta.nome() + "\" está no prazo", contribuicao, porMes, List.of()));
            }
        }
        return sugestoes;
    }

    // Margem negativa com parcelas agendadas: as parcelas já não cabem na renda média menos as despesas
    public static Optional<SugestaoResposta> parcelasAcimaDaMargem(SugestaoParcelamentoResposta margem,
                                                                   List<ParcelamentoResposta> parcelamentosAtivos) {
        if (margem.margemLivre() == null || margem.margemLivre().signum() >= 0
                || margem.parcelasComprometidas().signum() <= 0) {
            return Optional.empty();
        }
        BigDecimal margemAntesDasParcelas = margem.rendaMedia().subtract(margem.despesasMedia());
        BigDecimal excesso = margem.margemLivre().negate();

        String mensagem = "Suas parcelas chegam a " + moeda(margem.parcelasComprometidas()) + " por mês, mas a sua "
                + "renda média menos as despesas dos últimos 3 meses deixa só " + moeda(margemAntesDasParcelas)
                + ". Faltam " + moeda(excesso) + " por mês: evite novos parcelamentos até algum terminar.";
        List<ItemSugestaoResposta> itens = parcelamentosAtivos.stream()
                .map(p -> new ItemSugestaoResposta(p.descricao() + " (" + p.quantidadeParcelas() + "x)", p.valorParcela()))
                .toList();

        return Optional.of(new SugestaoResposta(TipoSugestao.PARCELAS_ACIMA_DA_MARGEM, SeveridadeSugestao.ALERTA,
                "Parcelas acima da sua margem livre", mensagem, excesso, itens));
    }

    // Linear entre a criação e a data-alvo; null se a meta é recente demais pra cobrar ritmo
    static BigDecimal valorEsperadoPeloRitmo(MetaFinanceiraResposta meta, LocalDate hoje) {
        LocalDate inicio = meta.criadoEm().toLocalDate();
        long diasTotais = ChronoUnit.DAYS.between(inicio, meta.dataAlvo());
        long diasDecorridos = ChronoUnit.DAYS.between(inicio, hoje);
        if (diasTotais <= 0 || diasDecorridos < DIAS_MINIMOS_PARA_ATRASO) {
            return null;
        }
        return meta.valorAlvo().multiply(BigDecimal.valueOf(diasDecorridos))
                .divide(BigDecimal.valueOf(diasTotais), 2, RoundingMode.HALF_UP);
    }

    private static List<ItemSugestaoResposta> itens(List<TotalPorCategoriaResposta> totais) {
        return totais.stream()
                .limit(MAXIMO_CATEGORIAS_LISTADAS)
                .map(total -> new ItemSugestaoResposta(total.categoriaNome(), total.total()))
                .toList();
    }

    private static BigDecimal fracao(BigDecimal valor, BigDecimal percentual) {
        return valor.multiply(percentual).divide(CEM, 2, RoundingMode.DOWN);
    }

    private static String mes(IndicadorComprometimentoResposta indicador) {
        return YearMonth.parse(indicador.mes()).format(FORMATO_MES);
    }

    private static String moeda(BigDecimal valor) {
        // NBSP do NumberFormat vira espaço comum, pra o texto quebrar linha normalmente no frontend
        return NumberFormat.getCurrencyInstance(PT_BR).format(valor).replace(' ', ' ');
    }

    // Limites vêm inteiros na maioria das vezes: "80%", não "80,0%"
    private static String limite(BigDecimal valor) {
        return valor.stripTrailingZeros().toPlainString().replace('.', ',') + "%";
    }

    private static String percentual(BigDecimal valor) {
        return valor.setScale(1, RoundingMode.HALF_UP).toPlainString().replace('.', ',') + "%";
    }
}
