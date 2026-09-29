package com.financeflow.service;

import com.financeflow.dto.ContribuicaoMetaRequisicao;
import com.financeflow.dto.ContribuicaoMetaResposta;
import com.financeflow.dto.MetaFinanceiraRequisicao;
import com.financeflow.dto.MetaFinanceiraResposta;
import com.financeflow.exception.CategoriaInvalidaParaMetaException;
import com.financeflow.exception.CategoriaNaoEncontradaException;
import com.financeflow.exception.ContribuicaoInvalidaException;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

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
        Usuario usuario = buscarUsuarioPorEmail(emailUsuario);
        Categoria categoria = buscarCategoriaValida(requisicao.categoriaId(), usuario.getId());

        MetaFinanceira meta = new MetaFinanceira();
        meta.setUsuario(usuario);
        meta.setNome(requisicao.nome());
        meta.setValorAlvo(requisicao.valorAlvo());
        meta.setCategoria(categoria);
        meta.setDataAlvo(requisicao.dataAlvo());
        meta.setCriadoEm(LocalDateTime.now());

        repositorioMeta.save(meta);

        return montarResposta(meta);
    }

    public List<MetaFinanceiraResposta> listar(String emailUsuario) {
        Long usuarioId = buscarUsuarioPorEmail(emailUsuario).getId();
        return repositorioMeta.findByUsuarioId(usuarioId).stream()
                .map(this::montarResposta)
                .toList();
    }

    public MetaFinanceiraResposta buscarPorId(Long id, String emailUsuario) {
        return montarResposta(buscarEntidadePorId(id, emailUsuario));
    }

    public MetaFinanceiraResposta atualizar(Long id, MetaFinanceiraRequisicao requisicao, String emailUsuario) {
        MetaFinanceira meta = buscarEntidadePorId(id, emailUsuario);
        Categoria categoria = buscarCategoriaValida(requisicao.categoriaId(), meta.getUsuario().getId());

        meta.setNome(requisicao.nome());
        meta.setValorAlvo(requisicao.valorAlvo());
        meta.setCategoria(categoria);
        meta.setDataAlvo(requisicao.dataAlvo());

        repositorioMeta.save(meta);

        return montarResposta(meta);
    }

    public void deletar(Long id, String emailUsuario) {
        MetaFinanceira meta = buscarEntidadePorId(id, emailUsuario);
        repositorioContribuicao.deleteAll(repositorioContribuicao.findByMetaId(meta.getId()));
        repositorioMeta.delete(meta);
    }

    public ContribuicaoMetaResposta registrarContribuicao(Long metaId, ContribuicaoMetaRequisicao requisicao,
                                                            String emailUsuario) {
        Usuario usuario = buscarUsuarioPorEmail(emailUsuario);
        MetaFinanceira meta = buscarEntidadePorId(metaId, emailUsuario);
        Transacao transacao = repositorioTransacao.findByIdAndUsuarioId(requisicao.transacaoId(), usuario.getId())
                .orElseThrow(() -> new TransacaoNaoEncontradaException(requisicao.transacaoId()));

        if (transacao.getTipo() != TipoMovimentacao.RECEITA
                || !transacao.getCategoria().getId().equals(meta.getCategoria().getId())) {
            throw new ContribuicaoInvalidaException(
                    "a transação precisa ser uma receita da mesma categoria vinculada à meta");
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

    private MetaFinanceiraResposta montarResposta(MetaFinanceira meta) {
        BigDecimal valorAtual = repositorioContribuicao.somarPorMeta(meta.getId());
        return MetaFinanceiraResposta.de(meta, valorAtual);
    }

    private Categoria buscarCategoriaValida(Long categoriaId, Long usuarioId) {
        Categoria categoria = repositorioCategoria.findByIdAndUsuarioId(categoriaId, usuarioId)
                .orElseThrow(() -> new CategoriaNaoEncontradaException(categoriaId));

        if (categoria.getTipo() != TipoMovimentacao.RECEITA) {
            throw new CategoriaInvalidaParaMetaException();
        }

        return categoria;
    }

    private MetaFinanceira buscarEntidadePorId(Long id, String emailUsuario) {
        Long usuarioId = buscarUsuarioPorEmail(emailUsuario).getId();
        return repositorioMeta.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new MetaNaoEncontradaException(id));
    }

    private Usuario buscarUsuarioPorEmail(String email) {
        return repositorioUsuario.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("usuário do token não existe mais: " + email));
    }
}
