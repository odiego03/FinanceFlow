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

/**
 * Layout do extrato de conta do Nubank (validado contra um arquivo real
 * exportado): colunas "Data", "Valor", "Identificador", "Descrição", data
 * DD/MM/AAAA, valor decimal com ponto (negativo = saída/despesa), UTF-8.
 * O separador é detectado pela linha de cabeçalho (vírgula, ";" ou tab)
 * porque o arquivo muda de separador quando é aberto e salvo de novo numa
 * planilha. Data ISO (AAAA-MM-DD) também é aceita, por segurança.
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
            List<LinhaExtratoBruta> linhas = new ArrayList<>();
            for (CSVRecord registro : parser) {
                linhas.add(converterLinha(registro));
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
                    new BigDecimal(valorTexto));
        } catch (DateTimeException | NumberFormatException excecao) {
            throw new ArquivoExtratoInvalidoException("linha " + (registro.getRecordNumber() + 1)
                    + " do extrato do Nubank tem data ou valor inválido (data: \"" + dataTexto
                    + "\", valor: \"" + valorTexto + "\")");
        }
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
