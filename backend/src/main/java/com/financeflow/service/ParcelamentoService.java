package com.financeflow.service;

import com.financeflow.dto.ParcelamentoRequisicao;
import com.financeflow.dto.ParcelamentoResposta;
import com.financeflow.dto.SugestaoParcelamentoResposta;
import com.financeflow.exception.CategoriaNaoEncontradaException;
import com.financeflow.exception.ParcelamentoInvalidoException;
import com.financeflow.exception.ParcelamentoNaoEncontradoException;
import com.financeflow.model.Categoria;
import com.financeflow.model.Parcelamento;
import com.financeflow.model.TipoMovimentacao;
import com.financeflow.model.Transacao;
import com.financeflow.model.Usuario;
import com.financeflow.repository.CategoriaRepository;
import com.financeflow.repository.ParcelamentoRepository;
import com.financeflow.repository.TransacaoRepository;
import com.financeflow.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ParcelamentoService {

    static final int MESES_ANALISADOS = 3;

    private final ParcelamentoRepository repositorioParcelamento;
    private final TransacaoRepository repositorioTransacao;
    private final CategoriaRepository repositorioCategoria;
    private final UsuarioRepository repositorioUsuario;

    public ParcelamentoService(ParcelamentoRepository repositorioParcelamento, TransacaoRepository repositorioTransacao,
                               CategoriaRepository repositorioCategoria, UsuarioRepository repositorioUsuario) {
        this.repositorioParcelamento = repositorioParcelamento;
        this.repositorioTransacao = repositorioTransacao;
        this.repositorioCategoria = repositorioCategoria;
        this.repositorioUsuario = repositorioUsuario;
    }

    @Transactional
    public ParcelamentoResposta cadastrar(ParcelamentoRequisicao requisicao, String emailUsuario) {
        Usuario usuario = buscarUsuarioPorEmail(emailUsuario);
        Categoria categoria = repositorioCategoria.findByIdAndUsuarioId(requisicao.categoriaId(), usuario.getId())
                .orElseThrow(() -> new CategoriaNaoEncontradaException(requisicao.categoriaId()));
        if (categoria.getTipo() != TipoMovimentacao.DESPESA) {
            throw new ParcelamentoInvalidoException("parcelamento só pode usar uma categoria de despesa");
        }

        int quantidade = requisicao.quantidadeParcelas();
        List<BigDecimal> valores = CalculadoraParcelamento.dividir(requisicao.valorTotal(), quantidade);
        if (valores.get(0).signum() <= 0) {
            throw new ParcelamentoInvalidoException("o valor total é pequeno demais para " + quantidade + " parcelas");
        }

        String descricao = requisicao.descricao().trim();
        LocalDateTime agora = LocalDateTime.now();

        Parcelamento parcelamento = new Parcelamento();
        parcelamento.setUsuario(usuario);
        parcelamento.setCategoria(categoria);
        parcelamento.setDescricao(descricao);
        parcelamento.setValorTotal(requisicao.valorTotal());
        parcelamento.setQuantidadeParcelas(quantidade);
        parcelamento.setDataPrimeiraParcela(requisicao.dataPrimeiraParcela());
        parcelamento.setCriadoEm(agora);
        repositorioParcelamento.save(parcelamento);

        List<Transacao> parcelas = new ArrayList<>();
        for (int i = 0; i < quantidade; i++) {
            Transacao parcela = new Transacao();
            parcela.setUsuario(usuario);
            parcela.setCategoria(categoria);
            parcela.setTipo(TipoMovimentacao.DESPESA);
            parcela.setValor(valores.get(i));
            parcela.setDescricao(descricao + " (" + (i + 1) + "/" + quantidade + ")");
            parcela.setData(requisicao.dataPrimeiraParcela().plusMonths(i));
            parcela.setCriadoEm(agora);
            parcela.setParcelamento(parcelamento);
            parcela.setNumeroParcela(i + 1);
            parcelas.add(parcela);
        }
        repositorioTransacao.saveAll(parcelas);

        return ParcelamentoResposta.de(parcelamento, LocalDate.now());
    }

    public List<ParcelamentoResposta> listar(String emailUsuario) {
        Long usuarioId = buscarUsuarioPorEmail(emailUsuario).getId();
        LocalDate hoje = LocalDate.now();
        return repositorioParcelamento.findByUsuarioIdOrderByDataPrimeiraParcelaDesc(usuarioId).stream()
                .map(parcelamento -> ParcelamentoResposta.de(parcelamento, hoje))
                .toList();
    }

    public ParcelamentoResposta buscarPorId(Long id, String emailUsuario) {
        return ParcelamentoResposta.de(buscarEntidadePorId(id, emailUsuario), LocalDate.now());
    }

    // As parcelas futuras somem; as já vencidas ficam no histórico como transações comuns
    @Transactional
    public void deletar(Long id, String emailUsuario) {
        Parcelamento parcelamento = buscarEntidadePorId(id, emailUsuario);
        LocalDate hoje = LocalDate.now();

        List<Transacao> futuras = new ArrayList<>();
        List<Transacao> vencidas = new ArrayList<>();
        for (Transacao parcela : repositorioTransacao.findByParcelamentoId(parcelamento.getId())) {
            if (parcela.getData().isAfter(hoje)) {
                futuras.add(parcela);
            } else {
                parcela.setParcelamento(null);
                parcela.setNumeroParcela(null);
                vencidas.add(parcela);
            }
        }

        repositorioTransacao.deleteAll(futuras);
        repositorioTransacao.saveAll(vencidas);
        repositorioParcelamento.delete(parcelamento);
    }

    /**
     * Margem livre = renda média − despesas médias dos últimos 3 meses completos − parcelas já agendadas.
     * As despesas médias não contam parcelas: o que ainda vai ser pago entra em "parcelas já agendadas"
     * (o mês mais carregado a partir da primeira parcela nova), e parcelamento já encerrado não pesa mais.
     */
    public SugestaoParcelamentoResposta sugerir(String emailUsuario, BigDecimal valorTotal, LocalDate dataPrimeiraParcela) {
        Long usuarioId = buscarUsuarioPorEmail(emailUsuario).getId();
        List<Transacao> transacoes = repositorioTransacao.findByUsuarioId(usuarioId);

        YearMonth mesAtual = YearMonth.now();
        YearMonth inicioJanela = mesAtual.minusMonths(MESES_ANALISADOS);
        YearMonth mesPrimeiraParcela = YearMonth.from(dataPrimeiraParcela);

        BigDecimal renda = BigDecimal.ZERO;
        BigDecimal despesas = BigDecimal.ZERO;
        for (Transacao transacao : transacoes) {
            YearMonth mes = YearMonth.from(transacao.getData());
            if (mes.isBefore(inicioJanela) || !mes.isBefore(mesAtual)) {
                continue;
            }
            if (transacao.getTipo() == TipoMovimentacao.RECEITA) {
                renda = renda.add(transacao.getValor());
            } else if (transacao.getParcelamento() == null) {
                despesas = despesas.add(transacao.getValor());
            }
        }

        Map<YearMonth, BigDecimal> parcelasPorMes = transacoes.stream()
                .filter(t -> t.getParcelamento() != null && !YearMonth.from(t.getData()).isBefore(mesPrimeiraParcela))
                .collect(Collectors.groupingBy(t -> YearMonth.from(t.getData()),
                        Collectors.reducing(BigDecimal.ZERO, Transacao::getValor, BigDecimal::add)));
        BigDecimal comprometido = parcelasPorMes.values().stream().max(BigDecimal::compareTo).orElse(BigDecimal.ZERO);

        BigDecimal rendaMedia = CalculadoraParcelamento.mediaMensal(renda, MESES_ANALISADOS);
        BigDecimal despesasMedia = CalculadoraParcelamento.mediaMensal(despesas, MESES_ANALISADOS);
        BigDecimal margemLivre = renda.signum() > 0 ? rendaMedia.subtract(despesasMedia).subtract(comprometido) : null;

        return new SugestaoParcelamentoResposta(rendaMedia, despesasMedia, comprometido, margemLivre,
                CalculadoraParcelamento.quantidadeMinimaQueCabe(valorTotal, margemLivre));
    }

    private Parcelamento buscarEntidadePorId(Long id, String emailUsuario) {
        Long usuarioId = buscarUsuarioPorEmail(emailUsuario).getId();
        return repositorioParcelamento.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new ParcelamentoNaoEncontradoException(id));
    }

    private Usuario buscarUsuarioPorEmail(String email) {
        return repositorioUsuario.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("usuário do token não existe mais: " + email));
    }
}
