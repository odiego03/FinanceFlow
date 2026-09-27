package com.financeflow.service;

import com.financeflow.dto.AporteRequisicao;
import com.financeflow.dto.AporteResposta;
import com.financeflow.dto.MetaFinanceiraRequisicao;
import com.financeflow.dto.MetaFinanceiraResposta;
import com.financeflow.exception.AporteNaoEncontradoException;
import com.financeflow.exception.CategoriaInvalidaParaMetaException;
import com.financeflow.exception.CategoriaNaoEncontradaException;
import com.financeflow.exception.MetaNaoEncontradaException;
import com.financeflow.model.Aporte;
import com.financeflow.model.Categoria;
import com.financeflow.model.MetaFinanceira;
import com.financeflow.model.TipoMovimentacao;
import com.financeflow.model.Usuario;
import com.financeflow.repository.AporteRepository;
import com.financeflow.repository.CategoriaRepository;
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
    private final AporteRepository repositorioAporte;
    private final CategoriaRepository repositorioCategoria;
    private final TransacaoRepository repositorioTransacao;
    private final UsuarioRepository repositorioUsuario;

    public MetaFinanceiraService(MetaFinanceiraRepository repositorioMeta, AporteRepository repositorioAporte,
                                  CategoriaRepository repositorioCategoria, TransacaoRepository repositorioTransacao,
                                  UsuarioRepository repositorioUsuario) {
        this.repositorioMeta = repositorioMeta;
        this.repositorioAporte = repositorioAporte;
        this.repositorioCategoria = repositorioCategoria;
        this.repositorioTransacao = repositorioTransacao;
        this.repositorioUsuario = repositorioUsuario;
    }

    public MetaFinanceiraResposta cadastrar(MetaFinanceiraRequisicao requisicao, String emailUsuario) {
        Usuario usuario = buscarUsuarioPorEmail(emailUsuario);
        Categoria categoria = buscarCategoriaValidaOuNula(requisicao.categoriaId(), usuario.getId());

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
        Categoria categoria = buscarCategoriaValidaOuNula(requisicao.categoriaId(), meta.getUsuario().getId());

        meta.setNome(requisicao.nome());
        meta.setValorAlvo(requisicao.valorAlvo());
        meta.setCategoria(categoria);
        meta.setDataAlvo(requisicao.dataAlvo());

        repositorioMeta.save(meta);

        return montarResposta(meta);
    }

    public void deletar(Long id, String emailUsuario) {
        MetaFinanceira meta = buscarEntidadePorId(id, emailUsuario);
        repositorioAporte.deleteAll(repositorioAporte.findByMetaId(meta.getId()));
        repositorioMeta.delete(meta);
    }

    public AporteResposta registrarAporte(Long metaId, AporteRequisicao requisicao, String emailUsuario) {
        MetaFinanceira meta = buscarEntidadePorId(metaId, emailUsuario);

        Aporte aporte = new Aporte();
        aporte.setMeta(meta);
        aporte.setValor(requisicao.valor());
        aporte.setData(requisicao.data());
        aporte.setCriadoEm(LocalDateTime.now());

        repositorioAporte.save(aporte);

        return AporteResposta.de(aporte);
    }

    public void excluirAporte(Long metaId, Long aporteId, String emailUsuario) {
        MetaFinanceira meta = buscarEntidadePorId(metaId, emailUsuario);
        Aporte aporte = repositorioAporte.findByIdAndMetaId(aporteId, meta.getId())
                .orElseThrow(() -> new AporteNaoEncontradoException(aporteId));

        repositorioAporte.delete(aporte);
    }

    private MetaFinanceiraResposta montarResposta(MetaFinanceira meta) {
        BigDecimal totalAportes = repositorioAporte.somarPorMeta(meta.getId());
        BigDecimal totalReceitasCategoria = meta.getCategoria() != null
                ? repositorioTransacao.somarReceitasPorCategoria(meta.getCategoria().getId())
                : BigDecimal.ZERO;
        BigDecimal valorAtual = totalAportes.add(totalReceitasCategoria);

        List<AporteResposta> aportes = repositorioAporte.findByMetaId(meta.getId()).stream()
                .map(AporteResposta::de)
                .toList();

        return MetaFinanceiraResposta.de(meta, valorAtual, aportes);
    }

    private Categoria buscarCategoriaValidaOuNula(Long categoriaId, Long usuarioId) {
        if (categoriaId == null) {
            return null;
        }

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
