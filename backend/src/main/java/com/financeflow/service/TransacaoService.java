package com.financeflow.service;

import com.financeflow.dto.EvolucaoMensalResposta;
import com.financeflow.dto.ExclusaoEmMassaResposta;
import com.financeflow.dto.TotalPorCategoriaResposta;
import com.financeflow.dto.TransacaoRequisicao;
import com.financeflow.dto.TransacaoResposta;
import com.financeflow.exception.CategoriaNaoEncontradaException;
import com.financeflow.exception.ContribuicaoInvalidaException;
import com.financeflow.exception.ParcelamentoInvalidoException;
import com.financeflow.exception.PeriodoInvalidoException;
import com.financeflow.exception.TipoIncompativelException;
import com.financeflow.exception.TransacaoNaoEncontradaException;
import com.financeflow.model.Categoria;
import com.financeflow.model.ContribuicaoMeta;
import com.financeflow.model.TipoMovimentacao;
import com.financeflow.model.Transacao;
import com.financeflow.model.Usuario;
import com.financeflow.repository.CategoriaRepository;
import com.financeflow.repository.ContribuicaoMetaRepository;
import com.financeflow.repository.TransacaoRepository;
import com.financeflow.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class TransacaoService {

    private static final int MAXIMO_MESES_EVOLUCAO = 24;

    private final TransacaoRepository repositorioTransacao;
    private final CategoriaRepository repositorioCategoria;
    private final UsuarioRepository repositorioUsuario;
    private final ContribuicaoMetaRepository repositorioContribuicao;

    public TransacaoService(TransacaoRepository repositorioTransacao, CategoriaRepository repositorioCategoria,
                             UsuarioRepository repositorioUsuario, ContribuicaoMetaRepository repositorioContribuicao) {
        this.repositorioTransacao = repositorioTransacao;
        this.repositorioCategoria = repositorioCategoria;
        this.repositorioUsuario = repositorioUsuario;
        this.repositorioContribuicao = repositorioContribuicao;
    }

    public TransacaoResposta cadastrar(TransacaoRequisicao requisicao, String emailUsuario) {
        Usuario usuario = repositorioUsuario.buscarDoToken(emailUsuario);
        Categoria categoria = buscarCategoriaDoUsuario(requisicao.categoriaId(), usuario.getId());
        validarTipoCompativel(requisicao.tipo(), categoria);

        Transacao transacao = new Transacao();
        transacao.setUsuario(usuario);
        transacao.setCategoria(categoria);
        transacao.setTipo(requisicao.tipo());
        transacao.setValor(requisicao.valor());
        transacao.setDescricao(requisicao.descricao());
        transacao.setData(requisicao.data());
        transacao.setCriadoEm(LocalDateTime.now());

        repositorioTransacao.save(transacao);

        return montarResposta(transacao);
    }

    public List<TransacaoResposta> listar(String emailUsuario) {
        Long usuarioId = repositorioUsuario.buscarDoToken(emailUsuario).getId();

        Map<Long, BigDecimal> contribuidoPorTransacao = new HashMap<>();
        for (Object[] linha : repositorioContribuicao.somarPorTransacaoDoUsuario(usuarioId)) {
            contribuidoPorTransacao.put((Long) linha[0], (BigDecimal) linha[1]);
        }

        return repositorioTransacao.findByUsuarioId(usuarioId).stream()
                .map(transacao -> TransacaoResposta.de(transacao,
                        contribuidoPorTransacao.getOrDefault(transacao.getId(), BigDecimal.ZERO)))
                .toList();
    }

    public TransacaoResposta buscarPorId(Long id, String emailUsuario) {
        return montarResposta(buscarEntidadePorId(id, emailUsuario));
    }

    public TransacaoResposta atualizar(Long id, TransacaoRequisicao requisicao, String emailUsuario) {
        Transacao transacao = buscarEntidadePorId(id, emailUsuario);
        // Editar uma parcela sozinha quebraria a soma das parcelas = valor total (RN004)
        if (transacao.getParcelamento() != null) {
            throw new ParcelamentoInvalidoException(
                    "essa transação é uma parcela e não pode ser editada sozinha — "
                            + "pra corrigir, exclua o parcelamento e lance de novo");
        }
        Categoria categoria = buscarCategoriaDoUsuario(requisicao.categoriaId(), transacao.getUsuario().getId());
        validarTipoCompativel(requisicao.tipo(), categoria);

        BigDecimal jaContribuido = repositorioContribuicao.somarPorTransacao(transacao.getId());
        if (requisicao.valor().compareTo(jaContribuido) < 0) {
            throw new ContribuicaoInvalidaException(
                    "o valor da transação não pode ficar menor que o total já contribuído para metas (" + jaContribuido + ")");
        }
        // Contribuição só vale pra receita da categoria da meta (RN007); mudar isso deixaria a contribuição inconsistente
        boolean mudouTipoOuCategoria = requisicao.tipo() != transacao.getTipo()
                || !categoria.getId().equals(transacao.getCategoria().getId());
        if (jaContribuido.signum() > 0 && mudouTipoOuCategoria) {
            throw new ContribuicaoInvalidaException(
                    "essa transação já foi destinada a metas, então o tipo e a categoria não podem mudar — "
                            + "pra corrigir, exclua a transação (as contribuições saem junto) e lance de novo");
        }

        transacao.setCategoria(categoria);
        transacao.setTipo(requisicao.tipo());
        transacao.setValor(requisicao.valor());
        transacao.setDescricao(requisicao.descricao());
        transacao.setData(requisicao.data());

        repositorioTransacao.save(transacao);

        return montarResposta(transacao);
    }

    @Transactional
    public void deletar(Long id, String emailUsuario) {
        Transacao transacao = buscarEntidadePorId(id, emailUsuario);
        if (transacao.getParcelamento() != null) {
            throw new ParcelamentoInvalidoException(
                    "essa transação é uma parcela — exclua o parcelamento (as parcelas futuras saem junto)");
        }
        repositorioContribuicao.deleteAll(repositorioContribuicao.findByTransacaoId(transacao.getId()));
        repositorioTransacao.delete(transacao);
    }

    public ExclusaoEmMassaResposta previaExclusaoPorPeriodo(String emailUsuario, LocalDate inicio, LocalDate fim) {
        SelecaoExclusao selecao = selecionarParaExclusao(emailUsuario, inicio, fim);
        return selecao.resumo();
    }

    /**
     * Apaga as transações do período (sem limite = todo o histórico), junto com as contribuições delas pra metas.
     * Parcelas ficam de fora: parcela só sai excluindo o parcelamento (RN004). Em lote, numa consulta por tabela,
     * porque o delete um a um pagaria a latência do Neon por linha.
     */
    @Transactional
    public ExclusaoEmMassaResposta excluirPorPeriodo(String emailUsuario, LocalDate inicio, LocalDate fim) {
        SelecaoExclusao selecao = selecionarParaExclusao(emailUsuario, inicio, fim);
        repositorioContribuicao.deleteAllInBatch(selecao.contribuicoes());
        repositorioTransacao.deleteAllInBatch(selecao.transacoes());
        return selecao.resumo();
    }

    private SelecaoExclusao selecionarParaExclusao(String emailUsuario, LocalDate inicio, LocalDate fim) {
        if (inicio != null && fim != null && inicio.isAfter(fim)) {
            throw new PeriodoInvalidoException("a data inicial não pode ser depois da data final");
        }
        Long usuarioId = repositorioUsuario.buscarDoToken(emailUsuario).getId();

        List<Transacao> doPeriodo = repositorioTransacao.buscarDoPeriodo(usuarioId, inicio, fim);
        List<Transacao> transacoes = doPeriodo.stream().filter(t -> t.getParcelamento() == null).toList();
        int parcelasMantidas = doPeriodo.size() - transacoes.size();

        List<ContribuicaoMeta> contribuicoes = transacoes.isEmpty() ? List.of()
                : repositorioContribuicao.findByTransacaoIdIn(transacoes.stream().map(Transacao::getId).toList());

        ExclusaoEmMassaResposta resumo = new ExclusaoEmMassaResposta(
                transacoes.size(),
                somarPorTipo(transacoes, TipoMovimentacao.RECEITA),
                somarPorTipo(transacoes, TipoMovimentacao.DESPESA),
                contribuicoes.size(),
                contribuicoes.stream().map(ContribuicaoMeta::getValor).reduce(BigDecimal.ZERO, BigDecimal::add),
                parcelasMantidas
        );
        return new SelecaoExclusao(transacoes, contribuicoes, resumo);
    }

    private record SelecaoExclusao(List<Transacao> transacoes, List<ContribuicaoMeta> contribuicoes,
                                   ExclusaoEmMassaResposta resumo) {
    }

    private BigDecimal somarPorTipo(List<Transacao> transacoes, TipoMovimentacao tipo) {
        return transacoes.stream()
                .filter(t -> t.getTipo() == tipo)
                .map(Transacao::getValor)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public List<EvolucaoMensalResposta> evolucaoMensal(String emailUsuario, int quantidadeMeses) {
        Long usuarioId = repositorioUsuario.buscarDoToken(emailUsuario).getId();
        int meses = Math.max(1, Math.min(MAXIMO_MESES_EVOLUCAO, quantidadeMeses));
        YearMonth mesAtual = YearMonth.now();
        List<Transacao> transacoes = repositorioTransacao.findByUsuarioIdAndDataBetween(usuarioId,
                mesAtual.minusMonths(meses - 1).atDay(1), mesAtual.atEndOfMonth());

        List<EvolucaoMensalResposta> resultado = new ArrayList<>();

        for (int i = meses - 1; i >= 0; i--) {
            YearMonth mes = mesAtual.minusMonths(i);
            BigDecimal totalReceitas = somarPorTipoEMes(transacoes, TipoMovimentacao.RECEITA, mes);
            BigDecimal totalDespesas = somarPorTipoEMes(transacoes, TipoMovimentacao.DESPESA, mes);
            resultado.add(new EvolucaoMensalResposta(mes.toString(), totalReceitas, totalDespesas));
        }

        return resultado;
    }

    // mes == null significa todo o período
    public List<TotalPorCategoriaResposta> totaisPorCategoria(String emailUsuario, TipoMovimentacao tipo, YearMonth mes) {
        Long usuarioId = repositorioUsuario.buscarDoToken(emailUsuario).getId();

        List<Transacao> doPeriodo = mes == null ? repositorioTransacao.findByUsuarioId(usuarioId)
                : repositorioTransacao.findByUsuarioIdAndDataBetween(usuarioId, mes.atDay(1), mes.atEndOfMonth());
        List<Transacao> filtradas = doPeriodo.stream()
                .filter(t -> t.getTipo() == tipo)
                .toList();
        Map<Long, Categoria> categoriasPorId = filtradas.stream()
                .collect(Collectors.toMap(t -> t.getCategoria().getId(), Transacao::getCategoria, (a, b) -> a));
        Map<Long, BigDecimal> totaisPorCategoriaId = filtradas.stream()
                .collect(Collectors.groupingBy(
                        t -> t.getCategoria().getId(),
                        Collectors.reducing(BigDecimal.ZERO, Transacao::getValor, BigDecimal::add)
                ));

        return totaisPorCategoriaId.entrySet().stream()
                .map(entrada -> {
                    Categoria categoria = categoriasPorId.get(entrada.getKey());
                    return new TotalPorCategoriaResposta(categoria.getId(), categoria.getNome(), categoria.getCor(),
                            entrada.getValue());
                })
                .sorted(Comparator.comparing(TotalPorCategoriaResposta::total).reversed())
                .toList();
    }

    private TransacaoResposta montarResposta(Transacao transacao) {
        BigDecimal valorContribuidoMetas = repositorioContribuicao.somarPorTransacao(transacao.getId());
        return TransacaoResposta.de(transacao, valorContribuidoMetas);
    }

    private BigDecimal somarPorTipoEMes(List<Transacao> transacoes, TipoMovimentacao tipo, YearMonth mes) {
        return transacoes.stream()
                .filter(t -> t.getTipo() == tipo && YearMonth.from(t.getData()).equals(mes))
                .map(Transacao::getValor)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void validarTipoCompativel(TipoMovimentacao tipo, Categoria categoria) {
        if (tipo != categoria.getTipo()) {
            throw new TipoIncompativelException();
        }
    }

    private Categoria buscarCategoriaDoUsuario(Long categoriaId, Long usuarioId) {
        return repositorioCategoria.findByIdAndUsuarioId(categoriaId, usuarioId)
                .orElseThrow(() -> new CategoriaNaoEncontradaException(categoriaId));
    }

    private Transacao buscarEntidadePorId(Long id, String emailUsuario) {
        Long usuarioId = repositorioUsuario.buscarDoToken(emailUsuario).getId();
        return repositorioTransacao.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new TransacaoNaoEncontradaException(id));
    }
}
