package com.financeflow.service;

import com.financeflow.dto.DespesaPorCategoriaResposta;
import com.financeflow.dto.EvolucaoMensalResposta;
import com.financeflow.dto.TransacaoRequisicao;
import com.financeflow.dto.TransacaoResposta;
import com.financeflow.exception.CategoriaNaoEncontradaException;
import com.financeflow.exception.ContribuicaoInvalidaException;
import com.financeflow.exception.TipoIncompativelException;
import com.financeflow.exception.TransacaoNaoEncontradaException;
import com.financeflow.model.Categoria;
import com.financeflow.model.TipoMovimentacao;
import com.financeflow.model.Transacao;
import com.financeflow.model.Usuario;
import com.financeflow.repository.CategoriaRepository;
import com.financeflow.repository.ContribuicaoMetaRepository;
import com.financeflow.repository.TransacaoRepository;
import com.financeflow.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class TransacaoService {

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
        Usuario usuario = buscarUsuarioPorEmail(emailUsuario);
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
        Long usuarioId = buscarUsuarioPorEmail(emailUsuario).getId();
        return repositorioTransacao.findByUsuarioId(usuarioId).stream()
                .map(this::montarResposta)
                .toList();
    }

    public TransacaoResposta buscarPorId(Long id, String emailUsuario) {
        return montarResposta(buscarEntidadePorId(id, emailUsuario));
    }

    public TransacaoResposta atualizar(Long id, TransacaoRequisicao requisicao, String emailUsuario) {
        Transacao transacao = buscarEntidadePorId(id, emailUsuario);
        Categoria categoria = buscarCategoriaDoUsuario(requisicao.categoriaId(), transacao.getUsuario().getId());
        validarTipoCompativel(requisicao.tipo(), categoria);

        BigDecimal jaContribuido = repositorioContribuicao.somarPorTransacao(transacao.getId());
        if (requisicao.valor().compareTo(jaContribuido) < 0) {
            throw new ContribuicaoInvalidaException(
                    "o valor da transação não pode ficar menor que o total já contribuído para metas (" + jaContribuido + ")");
        }

        transacao.setCategoria(categoria);
        transacao.setTipo(requisicao.tipo());
        transacao.setValor(requisicao.valor());
        transacao.setDescricao(requisicao.descricao());
        transacao.setData(requisicao.data());

        repositorioTransacao.save(transacao);

        return montarResposta(transacao);
    }

    public void deletar(Long id, String emailUsuario) {
        Transacao transacao = buscarEntidadePorId(id, emailUsuario);
        repositorioContribuicao.deleteAll(repositorioContribuicao.findByTransacaoId(transacao.getId()));
        repositorioTransacao.delete(transacao);
    }

    public List<EvolucaoMensalResposta> evolucaoMensal(String emailUsuario) {
        Long usuarioId = buscarUsuarioPorEmail(emailUsuario).getId();
        List<Transacao> transacoes = repositorioTransacao.findByUsuarioId(usuarioId);

        List<EvolucaoMensalResposta> resultado = new ArrayList<>();
        YearMonth mesAtual = YearMonth.now();

        for (int i = 5; i >= 0; i--) {
            YearMonth mes = mesAtual.minusMonths(i);
            BigDecimal totalReceitas = somarPorTipoEMes(transacoes, TipoMovimentacao.RECEITA, mes);
            BigDecimal totalDespesas = somarPorTipoEMes(transacoes, TipoMovimentacao.DESPESA, mes);
            resultado.add(new EvolucaoMensalResposta(mes.toString(), totalReceitas, totalDespesas));
        }

        return resultado;
    }

    public List<DespesaPorCategoriaResposta> despesasPorCategoria(String emailUsuario) {
        Long usuarioId = buscarUsuarioPorEmail(emailUsuario).getId();
        YearMonth mesAtual = YearMonth.now();

        Map<String, BigDecimal> totaisPorCategoria = repositorioTransacao.findByUsuarioId(usuarioId).stream()
                .filter(t -> t.getTipo() == TipoMovimentacao.DESPESA && YearMonth.from(t.getData()).equals(mesAtual))
                .collect(Collectors.groupingBy(
                        t -> t.getCategoria().getNome(),
                        Collectors.reducing(BigDecimal.ZERO, Transacao::getValor, BigDecimal::add)
                ));

        return totaisPorCategoria.entrySet().stream()
                .map(entrada -> new DespesaPorCategoriaResposta(entrada.getKey(), entrada.getValue()))
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
        Long usuarioId = buscarUsuarioPorEmail(emailUsuario).getId();
        return repositorioTransacao.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new TransacaoNaoEncontradaException(id));
    }

    private Usuario buscarUsuarioPorEmail(String email) {
        return repositorioUsuario.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("usuário do token não existe mais: " + email));
    }
}
