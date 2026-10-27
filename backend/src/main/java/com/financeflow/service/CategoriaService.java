package com.financeflow.service;

import com.financeflow.dto.CategoriaPredefinidaResposta;
import com.financeflow.dto.CategoriaRequisicao;
import com.financeflow.dto.CategoriaResposta;
import com.financeflow.exception.CategoriaEmUsoException;
import com.financeflow.exception.CategoriaNaoEncontradaException;
import com.financeflow.model.Categoria;
import com.financeflow.model.TipoMovimentacao;
import com.financeflow.model.Usuario;
import com.financeflow.repository.CategoriaRepository;
import com.financeflow.repository.MetaFinanceiraRepository;
import com.financeflow.repository.RegraCategorizacaoRepository;
import com.financeflow.repository.TransacaoRepository;
import com.financeflow.repository.UsuarioRepository;
import com.financeflow.service.CategoriasPredefinidas.CategoriaPredefinidaModelo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class CategoriaService {

    private final CategoriaRepository repositorioCategoria;
    private final UsuarioRepository repositorioUsuario;
    private final TransacaoRepository repositorioTransacao;
    private final MetaFinanceiraRepository repositorioMeta;
    private final RegraCategorizacaoRepository repositorioRegra;

    public CategoriaService(CategoriaRepository repositorioCategoria, UsuarioRepository repositorioUsuario,
                            TransacaoRepository repositorioTransacao, MetaFinanceiraRepository repositorioMeta,
                            RegraCategorizacaoRepository repositorioRegra) {
        this.repositorioCategoria = repositorioCategoria;
        this.repositorioUsuario = repositorioUsuario;
        this.repositorioTransacao = repositorioTransacao;
        this.repositorioMeta = repositorioMeta;
        this.repositorioRegra = repositorioRegra;
    }

    public CategoriaResposta cadastrar(CategoriaRequisicao requisicao, String emailUsuario) {
        Categoria categoria = new Categoria();
        categoria.setNome(requisicao.nome());
        categoria.setTipo(requisicao.tipo());
        categoria.setIcone(requisicao.icone());
        categoria.setCor(requisicao.cor());
        categoria.setEssencial(essencialDaRequisicao(requisicao, categoria));
        categoria.setUsuario(repositorioUsuario.buscarDoToken(emailUsuario));

        repositorioCategoria.save(categoria);

        return CategoriaResposta.de(categoria);
    }

    public void semearPredefinidas(Usuario usuario) {
        List<Categoria> categorias = CategoriasPredefinidas.CATALOGO.stream()
                .map(modelo -> criarCategoriaDoModelo(modelo, usuario))
                .toList();
        repositorioCategoria.saveAll(categorias);
    }

    public List<CategoriaPredefinidaResposta> listarPredefinidas() {
        return CategoriasPredefinidas.CATALOGO.stream()
                .map(CategoriaPredefinidaResposta::de)
                .toList();
    }

    public List<CategoriaResposta> adicionarPredefinidasFaltantes(String emailUsuario) {
        Usuario usuario = repositorioUsuario.buscarDoToken(emailUsuario);
        Set<String> existentes = repositorioCategoria.findByUsuarioId(usuario.getId()).stream()
                .map(categoria -> categoria.getNome() + "|" + categoria.getTipo())
                .collect(Collectors.toSet());

        List<Categoria> faltantes = CategoriasPredefinidas.CATALOGO.stream()
                .filter(modelo -> !existentes.contains(modelo.nome() + "|" + modelo.tipo()))
                .map(modelo -> criarCategoriaDoModelo(modelo, usuario))
                .toList();

        repositorioCategoria.saveAll(faltantes);

        return faltantes.stream().map(CategoriaResposta::de).toList();
    }

    private Categoria criarCategoriaDoModelo(CategoriaPredefinidaModelo modelo, Usuario usuario) {
        Categoria categoria = new Categoria();
        categoria.setNome(modelo.nome());
        categoria.setTipo(modelo.tipo());
        categoria.setIcone(modelo.icone());
        categoria.setCor(modelo.cor());
        categoria.setEssencial(modelo.essencial());
        categoria.setUsuario(usuario);
        return categoria;
    }

    public List<CategoriaResposta> listar(String emailUsuario) {
        Long usuarioId = repositorioUsuario.buscarDoToken(emailUsuario).getId();
        return repositorioCategoria.findByUsuarioId(usuarioId).stream()
                .map(CategoriaResposta::de)
                .toList();
    }

    public CategoriaResposta buscarPorId(Long id, String emailUsuario) {
        return CategoriaResposta.de(buscarEntidadePorId(id, emailUsuario));
    }

    public CategoriaResposta atualizar(Long id, CategoriaRequisicao requisicao, String emailUsuario) {
        Categoria categoria = buscarEntidadePorId(id, emailUsuario);
        // Trocar o tipo deixaria as transações com tipo diferente da categoria (RN003) e a meta numa despesa (RN007)
        if (requisicao.tipo() != categoria.getTipo()) {
            long quantidadeTransacoes = repositorioTransacao.countByCategoriaId(categoria.getId());
            long quantidadeMetas = repositorioMeta.countByCategoriaId(categoria.getId());
            if (quantidadeTransacoes > 0 || quantidadeMetas > 0) {
                throw new CategoriaEmUsoException("mudar o tipo", quantidadeTransacoes, quantidadeMetas);
            }
        }
        categoria.setNome(requisicao.nome());
        categoria.setTipo(requisicao.tipo());
        categoria.setIcone(requisicao.icone());
        categoria.setCor(requisicao.cor());
        categoria.setEssencial(essencialDaRequisicao(requisicao, categoria));

        repositorioCategoria.save(categoria);

        return CategoriaResposta.de(categoria);
    }

    // Regras de categorização aprendidas não bloqueiam a exclusão — são só memória da importação, vão junto
    @Transactional
    public void deletar(Long id, String emailUsuario) {
        Categoria categoria = buscarEntidadePorId(id, emailUsuario);
        long quantidadeTransacoes = repositorioTransacao.countByCategoriaId(categoria.getId());
        long quantidadeMetas = repositorioMeta.countByCategoriaId(categoria.getId());
        if (quantidadeTransacoes > 0 || quantidadeMetas > 0) {
            throw new CategoriaEmUsoException("excluir", quantidadeTransacoes, quantidadeMetas);
        }
        repositorioRegra.deleteByCategoriaId(categoria.getId());
        repositorioCategoria.delete(categoria);
    }

    // Receita nunca é essencial; sem valor na requisição, mantém o que já tinha (null = padrão do catálogo)
    private Boolean essencialDaRequisicao(CategoriaRequisicao requisicao, Categoria categoria) {
        if (requisicao.tipo() == TipoMovimentacao.RECEITA) {
            return false;
        }
        return requisicao.essencial() != null ? requisicao.essencial() : categoria.getEssencial();
    }

    private Categoria buscarEntidadePorId(Long id, String emailUsuario) {
        Long usuarioId = repositorioUsuario.buscarDoToken(emailUsuario).getId();
        return repositorioCategoria.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new CategoriaNaoEncontradaException(id));
    }
}
