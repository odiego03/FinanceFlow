package com.financeflow.service;

import com.financeflow.dto.TransacaoRequisicao;
import com.financeflow.dto.TransacaoResposta;
import com.financeflow.exception.CategoriaNaoEncontradaException;
import com.financeflow.exception.TipoIncompativelException;
import com.financeflow.exception.TransacaoNaoEncontradaException;
import com.financeflow.model.Categoria;
import com.financeflow.model.TipoMovimentacao;
import com.financeflow.model.Transacao;
import com.financeflow.model.Usuario;
import com.financeflow.repository.CategoriaRepository;
import com.financeflow.repository.TransacaoRepository;
import com.financeflow.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class TransacaoService {

    private final TransacaoRepository repositorioTransacao;
    private final CategoriaRepository repositorioCategoria;
    private final UsuarioRepository repositorioUsuario;

    public TransacaoService(TransacaoRepository repositorioTransacao, CategoriaRepository repositorioCategoria,
                             UsuarioRepository repositorioUsuario) {
        this.repositorioTransacao = repositorioTransacao;
        this.repositorioCategoria = repositorioCategoria;
        this.repositorioUsuario = repositorioUsuario;
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

        return TransacaoResposta.de(transacao);
    }

    public List<TransacaoResposta> listar(String emailUsuario) {
        Long usuarioId = buscarUsuarioPorEmail(emailUsuario).getId();
        return repositorioTransacao.findByUsuarioId(usuarioId).stream()
                .map(TransacaoResposta::de)
                .toList();
    }

    public TransacaoResposta buscarPorId(Long id, String emailUsuario) {
        return TransacaoResposta.de(buscarEntidadePorId(id, emailUsuario));
    }

    public TransacaoResposta atualizar(Long id, TransacaoRequisicao requisicao, String emailUsuario) {
        Transacao transacao = buscarEntidadePorId(id, emailUsuario);
        Categoria categoria = buscarCategoriaDoUsuario(requisicao.categoriaId(), transacao.getUsuario().getId());
        validarTipoCompativel(requisicao.tipo(), categoria);

        transacao.setCategoria(categoria);
        transacao.setTipo(requisicao.tipo());
        transacao.setValor(requisicao.valor());
        transacao.setDescricao(requisicao.descricao());
        transacao.setData(requisicao.data());

        repositorioTransacao.save(transacao);

        return TransacaoResposta.de(transacao);
    }

    public void deletar(Long id, String emailUsuario) {
        Transacao transacao = buscarEntidadePorId(id, emailUsuario);
        repositorioTransacao.delete(transacao);
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
