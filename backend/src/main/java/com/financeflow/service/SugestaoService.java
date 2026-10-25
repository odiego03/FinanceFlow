package com.financeflow.service;

import com.financeflow.dto.CenarioSimulacaoResposta;
import com.financeflow.dto.IndicadorComprometimentoResposta;
import com.financeflow.dto.ParcelamentoResposta;
import com.financeflow.dto.SimulacaoRequisicao;
import com.financeflow.dto.SimulacaoResposta;
import com.financeflow.dto.SugestaoResposta;
import com.financeflow.dto.TotalPorCategoriaResposta;
import com.financeflow.model.Categoria;
import com.financeflow.model.TipoMovimentacao;
import com.financeflow.model.Transacao;
import com.financeflow.model.Usuario;
import com.financeflow.repository.TransacaoRepository;
import com.financeflow.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class SugestaoService {

    private final TransacaoRepository repositorioTransacao;
    private final UsuarioRepository repositorioUsuario;
    private final MetaFinanceiraService metaFinanceiraService;
    private final ParcelamentoService parcelamentoService;
    private final SimulacaoService simulacaoService;

    public SugestaoService(TransacaoRepository repositorioTransacao, UsuarioRepository repositorioUsuario,
                           MetaFinanceiraService metaFinanceiraService, ParcelamentoService parcelamentoService,
                           SimulacaoService simulacaoService) {
        this.repositorioTransacao = repositorioTransacao;
        this.repositorioUsuario = repositorioUsuario;
        this.metaFinanceiraService = metaFinanceiraService;
        this.parcelamentoService = parcelamentoService;
        this.simulacaoService = simulacaoService;
    }

    // As regras do mês (comprometimento e sobra) usam `mes`; metas e parcelas olham pra frente a partir de hoje
    public List<SugestaoResposta> listar(String emailUsuario, YearMonth mes) {
        Usuario usuario = repositorioUsuario.findByEmail(emailUsuario)
                .orElseThrow(() -> new IllegalStateException("usuário do token não existe mais: " + emailUsuario));
        LocalDate hoje = LocalDate.now();

        List<Transacao> doMes = repositorioTransacao.findByUsuarioId(usuario.getId()).stream()
                .filter(transacao -> YearMonth.from(transacao.getData()).equals(mes))
                .toList();
        List<Transacao> despesas = doMes.stream().filter(t -> t.getTipo() == TipoMovimentacao.DESPESA).toList();
        List<TotalPorCategoriaResposta> essenciais = totaisPorCategoria(despesas, true);
        List<TotalPorCategoriaResposta> naoEssenciais = totaisPorCategoria(despesas, false);

        BigDecimal renda = somar(doMes.stream().filter(t -> t.getTipo() == TipoMovimentacao.RECEITA).toList());
        IndicadorComprometimentoResposta indicador = CalculadoraComprometimento.calcular(mes, renda,
                somarTotais(essenciais), somarTotais(naoEssenciais));

        List<SugestaoResposta> sugestoes = new ArrayList<>();
        RegrasSugestao.reduzirGastos(indicador, naoEssenciais).ifPresent(sugestoes::add);
        RegrasSugestao.reduzirEssenciais(indicador, essenciais).ifPresent(sugestoes::add);
        RegrasSugestao.semRenda(indicador).ifPresent(sugestoes::add);
        RegrasSugestao.investirSobra(indicador, melhorCenarioParaSobra(indicador)).ifPresent(sugestoes::add);
        sugestoes.addAll(RegrasSugestao.metas(metaFinanceiraService.listar(emailUsuario), hoje));

        List<ParcelamentoResposta> ativos = parcelamentoService.listar(emailUsuario).stream()
                .filter(parcelamento -> parcelamento.parcelasVencidas() < parcelamento.quantidadeParcelas())
                .toList();
        if (!ativos.isEmpty()) {
            RegrasSugestao.parcelasAcimaDaMargem(parcelamentoService.sugerir(emailUsuario, null, hoje), ativos)
                    .ifPresent(sugestoes::add);
        }

        // sort estável: dentro da mesma severidade, mantém a ordem das regras acima
        sugestoes.sort(Comparator.comparing(SugestaoResposta::severidade));
        return sugestoes;
    }

    private CenarioSimulacaoResposta melhorCenarioParaSobra(IndicadorComprometimentoResposta indicador) {
        BigDecimal sobra = indicador.renda().subtract(indicador.despesasTotais());
        if (sobra.signum() <= 0) {
            return null;
        }
        SimulacaoResposta simulacao = simulacaoService.simular(
                new SimulacaoRequisicao(BigDecimal.ZERO, sobra, RegrasSugestao.MESES_SIMULACAO_SOBRA, null));
        return simulacao.cenarios().stream()
                .filter(cenario -> cenario.tipo() == simulacao.melhorCenario())
                .findFirst()
                .orElse(null);
    }

    private List<TotalPorCategoriaResposta> totaisPorCategoria(List<Transacao> despesas, boolean essencial) {
        Map<Long, Categoria> categorias = new LinkedHashMap<>();
        Map<Long, BigDecimal> totais = new LinkedHashMap<>();
        for (Transacao despesa : despesas) {
            Categoria categoria = despesa.getCategoria();
            if (CategoriasPredefinidas.ehEssencial(categoria) != essencial) {
                continue;
            }
            categorias.putIfAbsent(categoria.getId(), categoria);
            totais.merge(categoria.getId(), despesa.getValor(), BigDecimal::add);
        }
        return totais.entrySet().stream()
                .map(entrada -> {
                    Categoria categoria = categorias.get(entrada.getKey());
                    return new TotalPorCategoriaResposta(categoria.getId(), categoria.getNome(), categoria.getCor(),
                            entrada.getValue());
                })
                .sorted(Comparator.comparing(TotalPorCategoriaResposta::total).reversed())
                .toList();
    }

    private BigDecimal somar(List<Transacao> transacoes) {
        return transacoes.stream().map(Transacao::getValor).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal somarTotais(List<TotalPorCategoriaResposta> totais) {
        return totais.stream().map(TotalPorCategoriaResposta::total).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
