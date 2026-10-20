package com.financeflow.service;

import com.financeflow.dto.BancoExtrato;
import com.financeflow.dto.ImportacaoResultadoResposta;
import com.financeflow.dto.LinhaImportacaoConfirmacaoRequisicao;
import com.financeflow.dto.LinhaImportacaoResposta;
import com.financeflow.dto.OrigemSugestaoCategoria;
import com.financeflow.dto.TransacaoResposta;
import com.financeflow.exception.ArquivoExtratoInvalidoException;
import com.financeflow.exception.CategoriaNaoEncontradaException;
import com.financeflow.exception.TipoIncompativelException;
import com.financeflow.model.Categoria;
import com.financeflow.model.RegraCategorizacao;
import com.financeflow.model.TipoMovimentacao;
import com.financeflow.model.Transacao;
import com.financeflow.model.Usuario;
import com.financeflow.repository.CategoriaRepository;
import com.financeflow.repository.RegraCategorizacaoRepository;
import com.financeflow.repository.TransacaoRepository;
import com.financeflow.repository.UsuarioRepository;
import com.financeflow.service.extrato.ExtratoParser;
import com.financeflow.service.extrato.ItauExtratoParser;
import com.financeflow.service.extrato.LinhaExtratoBruta;
import com.financeflow.service.extrato.NubankExtratoParser;
import com.financeflow.service.extrato.SugestorCategoria;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ImportacaoExtratoService {

    private final NubankExtratoParser parserNubank;
    private final ItauExtratoParser parserItau;
    private final SugestorCategoria sugestorCategoria;
    private final CategoriaRepository repositorioCategoria;
    private final RegraCategorizacaoRepository repositorioRegra;
    private final TransacaoRepository repositorioTransacao;
    private final UsuarioRepository repositorioUsuario;

    public ImportacaoExtratoService(NubankExtratoParser parserNubank, ItauExtratoParser parserItau,
                                     SugestorCategoria sugestorCategoria, CategoriaRepository repositorioCategoria,
                                     RegraCategorizacaoRepository repositorioRegra,
                                     TransacaoRepository repositorioTransacao, UsuarioRepository repositorioUsuario) {
        this.parserNubank = parserNubank;
        this.parserItau = parserItau;
        this.sugestorCategoria = sugestorCategoria;
        this.repositorioCategoria = repositorioCategoria;
        this.repositorioRegra = repositorioRegra;
        this.repositorioTransacao = repositorioTransacao;
        this.repositorioUsuario = repositorioUsuario;
    }

    public List<LinhaImportacaoResposta> prever(MultipartFile arquivo, BancoExtrato banco, String emailUsuario) {
        Usuario usuario = buscarUsuarioPorEmail(emailUsuario);
        ExtratoParser parser = escolherParser(banco);

        List<LinhaExtratoBruta> linhasBrutas;
        try {
            linhasBrutas = parser.parsear(arquivo.getInputStream());
        } catch (IOException excecao) {
            throw new ArquivoExtratoInvalidoException("não foi possível ler o arquivo enviado");
        }

        if (linhasBrutas.isEmpty()) {
            throw new ArquivoExtratoInvalidoException("nenhum lançamento encontrado no arquivo");
        }

        List<String> chaves = linhasBrutas.stream()
                .map(linha -> sugestorCategoria.chaveDe(linha.descricao()))
                .distinct()
                .toList();
        Map<String, RegraCategorizacao> regrasPorChave = new HashMap<>();
        for (RegraCategorizacao regra : repositorioRegra.findByUsuarioIdAndDescricaoNormalizadaIn(usuario.getId(), chaves)) {
            regrasPorChave.put(regra.getDescricaoNormalizada(), regra);
        }

        Map<String, Categoria> categoriasPorNomeETipo = new HashMap<>();
        for (Categoria categoria : repositorioCategoria.findByUsuarioId(usuario.getId())) {
            categoriasPorNomeETipo.putIfAbsent(chaveCategoria(categoria.getNome(), categoria.getTipo()), categoria);
        }

        return linhasBrutas.stream().map(linhaBruta -> {
            TipoMovimentacao tipo = linhaBruta.valorComSinal().signum() < 0 ? TipoMovimentacao.DESPESA : TipoMovimentacao.RECEITA;
            BigDecimal valorAbsoluto = linhaBruta.valorComSinal().abs();
            String chave = sugestorCategoria.chaveDe(linhaBruta.descricao());

            Categoria sugerida = null;
            OrigemSugestaoCategoria origem = null;
            RegraCategorizacao regra = regrasPorChave.get(chave);
            if (regra != null && regra.getCategoria().getTipo() == tipo) {
                sugerida = regra.getCategoria();
                origem = OrigemSugestaoCategoria.APRENDIDA;
            } else {
                sugerida = sugestorCategoria.sugerirNomeCategoria(chave, tipo)
                        .map(nome -> categoriasPorNomeETipo.get(chaveCategoria(nome, tipo)))
                        .orElse(null);
                origem = sugerida != null ? OrigemSugestaoCategoria.PALAVRA_CHAVE : null;
            }

            boolean duplicada = repositorioTransacao.existsByUsuarioIdAndDataAndValorAndDescricao(
                    usuario.getId(), linhaBruta.data(), valorAbsoluto, linhaBruta.descricao());

            return new LinhaImportacaoResposta(linhaBruta.data(), linhaBruta.descricao(), chave, valorAbsoluto, tipo,
                    sugerida != null ? sugerida.getId() : null, sugerida != null ? sugerida.getNome() : null,
                    origem, duplicada);
        }).toList();
    }

    @Transactional
    public ImportacaoResultadoResposta confirmar(List<LinhaImportacaoConfirmacaoRequisicao> linhas, String emailUsuario) {
        Usuario usuario = buscarUsuarioPorEmail(emailUsuario);
        List<TransacaoResposta> criadas = new ArrayList<>();

        for (LinhaImportacaoConfirmacaoRequisicao linha : linhas) {
            Categoria categoria = repositorioCategoria.findByIdAndUsuarioId(linha.categoriaId(), usuario.getId())
                    .orElseThrow(() -> new CategoriaNaoEncontradaException(linha.categoriaId()));
            if (categoria.getTipo() != linha.tipo()) {
                throw new TipoIncompativelException();
            }

            Transacao transacao = new Transacao();
            transacao.setUsuario(usuario);
            transacao.setCategoria(categoria);
            transacao.setTipo(linha.tipo());
            transacao.setValor(linha.valor());
            transacao.setDescricao(linha.descricao());
            transacao.setData(linha.data());
            transacao.setCriadoEm(LocalDateTime.now());
            repositorioTransacao.save(transacao);
            criadas.add(TransacaoResposta.de(transacao, BigDecimal.ZERO));

            aprenderRegra(usuario, linha.descricao(), categoria);
        }

        return new ImportacaoResultadoResposta(criadas.size(), criadas);
    }

    private void aprenderRegra(Usuario usuario, String descricao, Categoria categoria) {
        String chave = sugestorCategoria.chaveDe(descricao);
        RegraCategorizacao regra = repositorioRegra.findByUsuarioIdAndDescricaoNormalizada(usuario.getId(), chave)
                .orElseGet(RegraCategorizacao::new);
        regra.setUsuario(usuario);
        regra.setDescricaoNormalizada(chave);
        regra.setCategoria(categoria);
        repositorioRegra.save(regra);
    }

    private String chaveCategoria(String nome, TipoMovimentacao tipo) {
        return SugestorCategoria.normalizar(nome) + "|" + tipo;
    }

    private ExtratoParser escolherParser(BancoExtrato banco) {
        return switch (banco) {
            case NUBANK -> parserNubank;
            case ITAU -> parserItau;
        };
    }

    private Usuario buscarUsuarioPorEmail(String email) {
        return repositorioUsuario.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("usuário do token não existe mais: " + email));
    }
}
