package com.financeflow.service.extrato;

import com.financeflow.exception.ArquivoExtratoInvalidoException;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.io.StringReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Dois layouts do Nubank, detectados pelo cabeçalho:
 * <ul>
 *   <li><b>Conta</b> (validado contra um arquivo real exportado): colunas "Data", "Valor", "Identificador",
 *       "Descrição", data DD/MM/AAAA, valor decimal com ponto (negativo = saída/despesa), UTF-8.</li>
 *   <li><b>Fatura do cartão de crédito</b> (validado contra um arquivo real): colunas "date", "title", "amount",
 *       data AAAA-MM-DD e valor com vírgula entre aspas ("1.016,13"). Aqui o sinal é o inverso: positivo é compra
 *       (despesa) e negativo é crédito ("- 1.016,13", com espaço). "Pagamento recebido" (o pagamento da fatura)
 *       é ignorado, porque sai da conta corrente e contaria duas vezes, e lançamentos com valor zero também.
 *       Outros créditos, como estornos, entram como receita.</li>
 * </ul>
 * O separador é detectado pela linha de cabeçalho (vírgula, ";" ou tab) porque o arquivo muda de separador quando
 * é aberto e salvo de novo numa planilha. Data ISO (AAAA-MM-DD) também é aceita no layout da conta.
 */
@Component
public class NubankExtratoParser implements ExtratoParser {

    private static final DateTimeFormatter FORMATO_DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final char BOM = '﻿';

    @Override
    public List<LinhaExtratoBruta> parsear(InputStream arquivo) {
        String conteudo = lerConteudo(arquivo);
        CSVFormat formato = CSVFormat.DEFAULT.builder()
                .setDelimiter(detectarSeparador(conteudo))
                .setHeader()
                .setSkipHeaderRecord(true)
                .setIgnoreHeaderCase(true)
                .setTrim(true)
                .build();

        try (CSVParser parser = formato.parse(new StringReader(conteudo))) {
            boolean fatura = parser.getHeaderMap().containsKey("title") || parser.getHeaderMap().containsKey("Title");
            List<LinhaExtratoBruta> linhas = new ArrayList<>();
            for (CSVRecord registro : parser) {
                if (fatura) {
                    LinhaExtratoBruta linha = converterLinhaFatura(registro);
                    if (linha != null) {
                        linhas.add(linha);
                    }
                } else {
                    linhas.add(converterLinha(registro));
                }
            }
            return linhas;
        } catch (IOException | IllegalArgumentException excecao) {
            throw new ArquivoExtratoInvalidoException(
                    "não foi possível ler o arquivo como extrato do Nubank: " + excecao.getMessage());
        }
    }

    private LinhaExtratoBruta converterLinha(CSVRecord registro) {
        String dataTexto = campo(registro, "Data");
        String valorTexto = campo(registro, "Valor");
        try {
            return new LinhaExtratoBruta(converterData(dataTexto), campo(registro, "Descrição", "Descricao"),
                    new BigDecimal(valorTexto), identificador(registro));
        } catch (DateTimeException | NumberFormatException excecao) {
            throw new ArquivoExtratoInvalidoException("linha " + (registro.getRecordNumber() + 1)
                    + " do extrato do Nubank tem data ou valor inválido (data: \"" + dataTexto
                    + "\", valor: \"" + valorTexto + "\")");
        }
    }

    // Fatura do cartão: null quando a linha não é um lançamento a importar (pagamento da fatura ou valor zero)
    private LinhaExtratoBruta converterLinhaFatura(CSVRecord registro) {
        String dataTexto = campo(registro, "date", "Date");
        String titulo = campo(registro, "title", "Title");
        String valorTexto = campo(registro, "amount", "Amount");
        try {
            BigDecimal valor = converterValorFatura(valorTexto);
            if (valor.signum() == 0 || titulo.toLowerCase(Locale.ROOT).startsWith("pagamento recebido")) {
                return null;
            }
            // No CSV da fatura positivo é compra; aqui despesa é negativo
            return new LinhaExtratoBruta(converterData(dataTexto), titulo, valor.negate(), null);
        } catch (DateTimeException | NumberFormatException excecao) {
            throw new ArquivoExtratoInvalidoException("linha " + (registro.getRecordNumber() + 1)
                    + " da fatura do Nubank tem data ou valor inválido (data: \"" + dataTexto
                    + "\", valor: \"" + valorTexto + "\")");
        }
    }

    // "1.016,13" -> 1016.13; "- 1.016,13" -> -1016.13; sem vírgula ("12.50") é lido como decimal com ponto
    private BigDecimal converterValorFatura(String valorTexto) {
        String limpo = valorTexto.replace(" ", "");
        if (limpo.contains(",")) {
            limpo = limpo.replace(".", "").replace(",", ".");
        }
        return new BigDecimal(limpo);
    }

    // Coluna opcional: extrato sem ela continua funcionando, só cai na detecção de duplicata por data+valor+descrição
    private String identificador(CSVRecord registro) {
        if (!registro.isMapped("Identificador")) {
            return null;
        }
        String valor = registro.get("Identificador");
        return valor == null || valor.isBlank() ? null : valor;
    }

    private LocalDate converterData(String dataTexto) {
        if (dataTexto.contains("/")) {
            return LocalDate.parse(dataTexto, FORMATO_DATA);
        }
        return LocalDate.parse(dataTexto, DateTimeFormatter.ISO_LOCAL_DATE);
    }

    private String lerConteudo(InputStream arquivo) {
        try {
            String conteudo = new String(arquivo.readAllBytes(), StandardCharsets.UTF_8);
            return !conteudo.isEmpty() && conteudo.charAt(0) == BOM ? conteudo.substring(1) : conteudo;
        } catch (IOException excecao) {
            throw new ArquivoExtratoInvalidoException("não foi possível ler o arquivo enviado");
        }
    }

    private char detectarSeparador(String conteudo) {
        int fimPrimeiraLinha = conteudo.indexOf('\n');
        String cabecalho = fimPrimeiraLinha == -1 ? conteudo : conteudo.substring(0, fimPrimeiraLinha);
        char melhor = ',';
        long maiorQuantidade = 0;
        for (char candidato : new char[]{',', ';', '\t'}) {
            long quantidade = cabecalho.chars().filter(c -> c == candidato).count();
            if (quantidade > maiorQuantidade) {
                melhor = candidato;
                maiorQuantidade = quantidade;
            }
        }
        return melhor;
    }

    private String campo(CSVRecord registro, String... nomesPossiveis) {
        for (String nome : nomesPossiveis) {
            if (registro.isMapped(nome)) {
                return registro.get(nome);
            }
        }
        throw new ArquivoExtratoInvalidoException(
                "coluna não encontrada no CSV (esperado um de: " + String.join(", ", nomesPossiveis) + ")");
    }
}
