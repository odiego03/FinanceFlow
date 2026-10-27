package com.financeflow.service;

import com.financeflow.dto.RelatorioResposta;
import com.financeflow.dto.TipoRelatorio;
import com.financeflow.exception.PeriodoInvalidoException;
import com.financeflow.model.TipoMovimentacao;
import com.financeflow.model.Transacao;
import com.financeflow.repository.TransacaoRepository;
import com.financeflow.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.Year;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.List;

/**
 * Relatório mensal (comparado com o mês anterior) ou anual (comparado com o ano anterior, mais a evolução mês a
 * mês). Calculado na hora a partir das transações; nada é gravado.
 */
@Service
public class RelatorioService {

    private final TransacaoRepository repositorioTransacao;
    private final UsuarioRepository repositorioUsuario;

    public RelatorioService(TransacaoRepository repositorioTransacao, UsuarioRepository repositorioUsuario) {
        this.repositorioTransacao = repositorioTransacao;
        this.repositorioUsuario = repositorioUsuario;
    }

    // referencia = AAAA-MM no MENSAL e AAAA no ANUAL
    public RelatorioResposta gerar(String emailUsuario, TipoRelatorio tipo, String referencia) {
        Long usuarioId = repositorioUsuario.buscarDoToken(emailUsuario).getId();
        LocalDate inicio;
        LocalDate fim;
        LocalDate inicioAnterior;
        LocalDate fimAnterior;
        String referenciaAnterior;
        try {
            if (tipo == TipoRelatorio.MENSAL) {
                YearMonth mes = YearMonth.parse(referencia);
                inicio = mes.atDay(1);
                fim = mes.atEndOfMonth();
                inicioAnterior = mes.minusMonths(1).atDay(1);
                fimAnterior = mes.minusMonths(1).atEndOfMonth();
                referenciaAnterior = mes.minusMonths(1).toString();
            } else {
                Year ano = Year.parse(referencia);
                inicio = ano.atDay(1);
                fim = ano.atMonth(12).atEndOfMonth();
                inicioAnterior = ano.minusYears(1).atDay(1);
                fimAnterior = ano.minusYears(1).atMonth(12).atEndOfMonth();
                referenciaAnterior = ano.minusYears(1).toString();
            }
        } catch (DateTimeParseException excecao) {
            throw new PeriodoInvalidoException(tipo == TipoRelatorio.MENSAL
                    ? "referência inválida: use AAAA-MM" : "referência inválida: use AAAA");
        }

        // Uma consulta só, do início do período anterior ao fim do atual
        List<Transacao> transacoes = repositorioTransacao.findByUsuarioIdAndDataBetween(usuarioId, inicioAnterior, fim);
        List<Transacao> atual = CalculadoraRelatorio.doPeriodo(transacoes, inicio, fim);
        List<Transacao> anterior = CalculadoraRelatorio.doPeriodo(transacoes, inicioAnterior, fimAnterior);

        return new RelatorioResposta(
                tipo,
                referencia,
                inicio,
                fim,
                referenciaAnterior,
                CalculadoraRelatorio.resumo(atual),
                CalculadoraRelatorio.resumo(anterior),
                CalculadoraRelatorio.porCategoria(atual, anterior, TipoMovimentacao.DESPESA),
                CalculadoraRelatorio.porCategoria(atual, anterior, TipoMovimentacao.RECEITA),
                CalculadoraRelatorio.maioresDespesas(atual),
                tipo == TipoRelatorio.ANUAL ? CalculadoraRelatorio.evolucaoDoAno(atual, inicio.getYear()) : List.of()
        );
    }
}
