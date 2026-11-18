package com.financeflow.service;

import com.financeflow.dto.ContribuicaoDaTransacaoResposta;
import com.financeflow.dto.ContribuicaoMetaDetalheResposta;
import com.financeflow.dto.ContribuicaoMetaRequisicao;
import com.financeflow.dto.ContribuicaoMetaResposta;
import com.financeflow.dto.MetaFinanceiraRequisicao;
import com.financeflow.dto.MetaFinanceiraResposta;
import com.financeflow.dto.NovoValorContribuicaoRequisicao;
import com.financeflow.exception.CategoriaInvalidaParaMetaException;
import com.financeflow.exception.CategoriaNaoEncontradaException;
import com.financeflow.exception.ContribuicaoInvalidaException;
import com.financeflow.exception.ContribuicaoNaoEncontradaException;
import com.financeflow.exception.MetaNaoEncontradaException;
import com.financeflow.exception.TransacaoNaoEncontradaException;
import com.financeflow.model.Categoria;
import com.financeflow.model.ContribuicaoMeta;
import com.financeflow.model.MetaFinanceira;
import com.financeflow.model.TipoMovimentacao;
import com.financeflow.model.Transacao;
import com.financeflow.model.Usuario;
import com.financeflow.repository.CategoriaRepository;
import com.financeflow.repository.ContribuicaoMetaRepository;
import com.financeflow.repository.MetaFinanceiraRepository;
import com.financeflow.repository.TransacaoRepository;
import com.financeflow.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class MetaFinanceiraService {

    private final MetaFinanceiraRepository repositorioMeta;
    private final ContribuicaoMetaRepository repositorioContribuicao;
    private final CategoriaRepository repositorioCategoria;
    private final TransacaoRepository repositorioTransacao;
    private final UsuarioRepository repositorioUsuario;

    public MetaFinanceiraService(MetaFinanceiraRepository repositorioMeta,
                                  ContribuicaoMetaRepository repositorioContribuicao,
                                  CategoriaRepository repositorioCategoria, TransacaoRepository repositorioTransacao,
                                  UsuarioRepository repositorioUsuario) {
        this.repositorioMeta = repositorioMeta;
        this.repositorioContribuicao = repositorioContribuicao;
        this.repositorioCategoria = repositorioCategoria;
        this.repositorioTransacao = repositorioTransacao;
        this.repositorioUsuario = repositorioUsuario;
    }

    public MetaFinanceiraResposta cadastrar(MetaFinanceiraRequisicao requisicao, String emailUsuario) {
        Usuario usuario = repositorioUsuario.buscarDoToken(emailUsuario);
        Set<Categoria> categorias = buscarCategoriasValidas(requisicao.categoriaIds(), usuario.getId());

        MetaFinanceira meta = new MetaFinanceira();
        meta.setUsuario(usuario);
        meta.setNome(requisicao.nome());
        meta.setValorAlvo(requisicao.valorAlvo());
        meta.setCategorias(categorias);
        meta.setDataAlvo(requisicao.dataAlvo());
        meta.setCriadoEm(LocalDateTime.now());

        repositorioMeta.save(meta);

        return montarResposta(meta);
    }

    public List<MetaFinanceiraResposta> listar(String emailUsuario) {
        Long usuarioId = repositorioUsuario.buscarDoToken(emailUsuario).getId();
        Map<Long, BigDecimal> contribuidoPorMeta = new HashMap<>();
        for (Object[] linha : repositorioContribuicao.somarPorMetaDoUsuario(usuarioId)) {
            contribuidoPorMeta.put((Long) linha[0], (BigDecimal) linha[1]);
        }
        return repositorioMeta.findByUsuarioId(usuarioId).stream()
                .map(meta -> MetaFinanceiraResposta.de(meta, contribuidoPorMeta.getOrDefault(meta.getId(), BigDecimal.ZERO)))
                .toList();
    }

    public MetaFinanceiraResposta buscarPorId(Long id, String emailUsuario) {
        return montarResposta(buscarEntidadePorId(id, emailUsuario));
    }

    @Transactional
    public MetaFinanceiraResposta atualizar(Long id, MetaFinanceiraRequisicao requisicao, String emailUsuario) {
        MetaFinanceira meta = buscarEntidadePorId(id, emailUsuario);
        Set<Categoria> categorias = buscarCategoriasValidas(requisicao.categoriaIds(), meta.getUsuario().getId());

        BigDecimal jaContribuido = repositorioContribuicao.somarPorMeta(meta.getId());
        if (requisicao.valorAlvo().compareTo(jaContribuido) < 0) {
            throw new ContribuicaoInvalidaException(
                    "o valor alvo não pode ficar menor que o já contribuído pra essa meta (" + jaContribuido + ")");
        }
        // Pode juntar mais categorias à meta, mas não tirar uma que já gerou contribuições (o progresso perderia a origem)
        Set<Long> idsNovos = new LinkedHashSet<>();
        categorias.forEach(categoria -> idsNovos.add(categoria.getId()));
        for (Categoria atual : meta.getCategorias()) {
            if (!idsNovos.contains(atual.getId())
                    && repositorioContribuicao.contarPorMetaECategoria(meta.getId(), atual.getId()) > 0) {
                throw new ContribuicaoInvalidaException(
                        "essa meta já recebeu contribuições da categoria \"" + atual.getNome()
                                + "\", então ela não pode ser removida da meta");
            }
        }

        meta.setNome(requisicao.nome());
        meta.setValorAlvo(requisicao.valorAlvo());
        meta.setCategorias(categorias);
        meta.setDataAlvo(requisicao.dataAlvo());

        repositorioMeta.save(meta);

        return montarResposta(meta);
    }

    @Transactional
    public void deletar(Long id, String emailUsuario) {
        MetaFinanceira meta = buscarEntidadePorId(id, emailUsuario);
        repositorioContribuicao.deleteAll(repositorioContribuicao.findByMetaId(meta.getId()));
        repositorioMeta.delete(meta);
    }

    // Meta e transação travadas (nessa ordem) até o commit: as somas abaixo não mudam no meio da validação
    @Transactional
    public ContribuicaoMetaResposta registrarContribuicao(Long metaId, ContribuicaoMetaRequisicao requisicao,
                                                            String emailUsuario) {
        Usuario usuario = repositorioUsuario.buscarDoToken(emailUsuario);
        MetaFinanceira meta = repositorioMeta.buscarParaAtualizar(metaId, usuario.getId())
                .orElseThrow(() -> new MetaNaoEncontradaException(metaId));
        Transacao transacao = repositorioTransacao.buscarParaAtualizar(requisicao.transacaoId(), usuario.getId())
                .orElseThrow(() -> new TransacaoNaoEncontradaException(requisicao.transacaoId()));

        boolean categoriaDaMeta = meta.getCategorias().stream()
                .anyMatch(categoria -> categoria.getId().equals(transacao.getCategoria().getId()));
        if (transacao.getTipo() != TipoMovimentacao.RECEITA || !categoriaDaMeta) {
            throw new ContribuicaoInvalidaException(
                    "a transação precisa ser uma receita de uma das categorias vinculadas à meta");
        }

        BigDecimal jaContribuidoNaTransacao = repositorioContribuicao.somarPorTransacao(transacao.getId());
        BigDecimal saldoDisponivelTransacao = transacao.getValor().subtract(jaContribuidoNaTransacao);
        if (requisicao.valor().compareTo(saldoDisponivelTransacao) > 0) {
            throw new ContribuicaoInvalidaException(
                    "valor da contribuição não pode ser maior que o saldo disponível da transação (" + saldoDisponivelTransacao + ")");
        }

        BigDecimal valorAtualMeta = repositorioContribuicao.somarPorMeta(meta.getId());
        BigDecimal saldoDisponivelMeta = meta.getValorAlvo().subtract(valorAtualMeta);
        if (requisicao.valor().compareTo(saldoDisponivelMeta) > 0) {
            throw new ContribuicaoInvalidaException(
                    "valor da contribuição não pode ser maior que o quanto falta pra bater a meta (" + saldoDisponivelMeta + ")");
        }

        ContribuicaoMeta contribuicao = new ContribuicaoMeta();
        contribuicao.setMeta(meta);
        contribuicao.setTransacao(transacao);
        contribuicao.setValor(requisicao.valor());
        contribuicao.setCriadoEm(LocalDateTime.now());

        repositorioContribuicao.save(contribuicao);

        return ContribuicaoMetaResposta.de(contribuicao);
    }

    @Transactional(readOnly = true)
    public List<ContribuicaoMetaDetalheResposta> listarContribuicoes(Long metaId, String emailUsuario) {
        MetaFinanceira meta = buscarEntidadePorId(metaId, emailUsuario);
        BigDecimal valorAtualMeta = repositorioContribuicao.somarPorMeta(meta.getId());
        Map<Long, BigDecimal> contribuidoPorTransacao = new HashMap<>();
        for (Object[] linha : repositorioContribuicao.somarPorTransacaoDoUsuario(meta.getUsuario().getId())) {
            contribuidoPorTransacao.put((Long) linha[0], (BigDecimal) linha[1]);
        }
        return repositorioContribuicao.listarDaMeta(meta.getId()).stream()
                .map(contribuicao -> {
                    BigDecimal contribuidoNaTransacao = contribuidoPorTransacao.getOrDefault(
                            contribuicao.getTransacao().getId(), BigDecimal.ZERO);
                    BigDecimal comporta = contribuicao.getTransacao().getValor()
                            .subtract(contribuidoNaTransacao.subtract(contribuicao.getValor()));
                    BigDecimal falta = meta.getValorAlvo().subtract(valorAtualMeta.subtract(contribuicao.getValor()));
                    return ContribuicaoMetaDetalheResposta.de(contribuicao, comporta.min(falta));
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ContribuicaoDaTransacaoResposta> listarContribuicoesDaTransacao(Long transacaoId, String emailUsuario) {
        Usuario usuario = repositorioUsuario.buscarDoToken(emailUsuario);
        Transacao transacao = repositorioTransacao.findByIdAndUsuarioId(transacaoId, usuario.getId())
                .orElseThrow(() -> new TransacaoNaoEncontradaException(transacaoId));
        List<ContribuicaoMeta> contribuicoes = repositorioContribuicao.listarDaTransacao(transacao.getId());
        BigDecimal contribuidoNaTransacao = contribuicoes.stream().map(ContribuicaoMeta::getValor)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<Long, BigDecimal> contribuidoPorMeta = new HashMap<>();
        for (Object[] linha : repositorioContribuicao.somarPorMetaDoUsuario(usuario.getId())) {
            contribuidoPorMeta.put((Long) linha[0], (BigDecimal) linha[1]);
        }
        return contribuicoes.stream()
                .map(contribuicao -> {
                    BigDecimal comporta = transacao.getValor()
                            .subtract(contribuidoNaTransacao.subtract(contribuicao.getValor()));
                    BigDecimal falta = contribuicao.getMeta().getValorAlvo().subtract(
                            contribuidoPorMeta.getOrDefault(contribuicao.getMeta().getId(), BigDecimal.ZERO)
                                    .subtract(contribuicao.getValor()));
                    return ContribuicaoDaTransacaoResposta.de(contribuicao, comporta.min(falta));
                })
                .toList();
    }

    // Muda o valor de uma contribuição (ex.: tirar 200 de 500 pra ficar com 300). As mesmas regras de registrar valem,
    // mas sem contar o valor antigo dessa contribuição nas somas
    @Transactional
    public ContribuicaoMetaResposta atualizarContribuicao(Long metaId, Long contribuicaoId,
                                                            NovoValorContribuicaoRequisicao requisicao, String emailUsuario) {
        Usuario usuario = repositorioUsuario.buscarDoToken(emailUsuario);
        MetaFinanceira meta = repositorioMeta.buscarParaAtualizar(metaId, usuario.getId())
                .orElseThrow(() -> new MetaNaoEncontradaException(metaId));
        ContribuicaoMeta contribuicao = repositorioContribuicao.findByIdAndMetaId(contribuicaoId, meta.getId())
                .orElseThrow(() -> new ContribuicaoNaoEncontradaException(contribuicaoId));
        Transacao transacao = repositorioTransacao.buscarParaAtualizar(contribuicao.getTransacao().getId(), usuario.getId())
                .orElseThrow(() -> new TransacaoNaoEncontradaException(contribuicao.getTransacao().getId()));

        BigDecimal valorAntigo = contribuicao.getValor();
        BigDecimal contribuidoNasOutras = repositorioContribuicao.somarPorTransacao(transacao.getId()).subtract(valorAntigo);
        BigDecimal saldoDisponivelTransacao = transacao.getValor().subtract(contribuidoNasOutras);
        if (requisicao.valor().compareTo(saldoDisponivelTransacao) > 0) {
            throw new ContribuicaoInvalidaException(
                    "valor da contribuição não pode ser maior que o saldo disponível da transação (" + saldoDisponivelTransacao + ")");
        }

        BigDecimal valorAtualSemEssa = repositorioContribuicao.somarPorMeta(meta.getId()).subtract(valorAntigo);
        BigDecimal saldoDisponivelMeta = meta.getValorAlvo().subtract(valorAtualSemEssa);
        if (requisicao.valor().compareTo(saldoDisponivelMeta) > 0) {
            throw new ContribuicaoInvalidaException(
                    "valor da contribuição não pode ser maior que o quanto falta pra bater a meta (" + saldoDisponivelMeta + ")");
        }

        contribuicao.setValor(requisicao.valor());
        repositorioContribuicao.save(contribuicao);

        return ContribuicaoMetaResposta.de(contribuicao);
    }

    // Tira a contribuição inteira: o valor volta a ficar livre na receita e sai do progresso da meta
    @Transactional
    public void removerContribuicao(Long metaId, Long contribuicaoId, String emailUsuario) {
        Usuario usuario = repositorioUsuario.buscarDoToken(emailUsuario);
        MetaFinanceira meta = repositorioMeta.buscarParaAtualizar(metaId, usuario.getId())
                .orElseThrow(() -> new MetaNaoEncontradaException(metaId));
        ContribuicaoMeta contribuicao = repositorioContribuicao.findByIdAndMetaId(contribuicaoId, meta.getId())
                .orElseThrow(() -> new ContribuicaoNaoEncontradaException(contribuicaoId));
        repositorioContribuicao.delete(contribuicao);
    }

    private MetaFinanceiraResposta montarResposta(MetaFinanceira meta) {
        BigDecimal valorAtual = repositorioContribuicao.somarPorMeta(meta.getId());
        return MetaFinanceiraResposta.de(meta, valorAtual);
    }

    // Todas as categorias precisam ser do usuário e do tipo RECEITA; ids repetidos viram um só
    private Set<Categoria> buscarCategoriasValidas(List<Long> categoriaIds, Long usuarioId) {
        Set<Categoria> categorias = new LinkedHashSet<>();
        for (Long categoriaId : new LinkedHashSet<>(categoriaIds)) {
            Categoria categoria = repositorioCategoria.findByIdAndUsuarioId(categoriaId, usuarioId)
                    .orElseThrow(() -> new CategoriaNaoEncontradaException(categoriaId));

            if (categoria.getTipo() != TipoMovimentacao.RECEITA) {
                throw new CategoriaInvalidaParaMetaException();
            }
            categorias.add(categoria);
        }
        return categorias;
    }

    private MetaFinanceira buscarEntidadePorId(Long id, String emailUsuario) {
        Long usuarioId = repositorioUsuario.buscarDoToken(emailUsuario).getId();
        return repositorioMeta.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new MetaNaoEncontradaException(id));
    }
}
