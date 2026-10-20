package com.financeflow.service.extrato;

import com.financeflow.exception.ArquivoExtratoInvalidoException;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
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
 * Layout assumido do extrato de conta corrente do Itaú: algumas linhas de
 * cabeçalho/metadados antes da tabela de verdade, colunas "data",
 * "lançamento", "valor" (nomes exatos a confirmar contra um arquivo real
 * exportado — ver "Risco conhecido" no plano da Sprint#3), separador ";",
 * data DD/MM/AAAA, valor decimal com vírgula.
 */
@Component
public class ItauExtratoParser implements ExtratoParser {

    private static final DateTimeFormatter FORMATO_DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy", new Locale("pt", "BR"));

    @Override
    public List<LinhaExtratoBruta> parsear(InputStream arquivo) {
        String tabelaCsv = localizarTabela(arquivo);

        CSVFormat formato = CSVFormat.DEFAULT.builder()
                .setDelimiter(';')
                .setHeader()
                .setSkipHeaderRecord(true)
                .setIgnoreHeaderCase(true)
                .setTrim(true)
                .build();

        try (CSVParser parser = formato.parse(new StringReader(tabelaCsv))) {
            List<LinhaExtratoBruta> linhas = new ArrayList<>();
            for (CSVRecord registro : parser) {
                String descricao = campo(registro, "lançamento", "lancamento", "descrição", "descricao", "histórico", "historico");
                LocalDate data = LocalDate.parse(campo(registro, "data"), FORMATO_DATA);
                BigDecimal valor = converterValor(campo(registro, "valor", "valor (r$)"));
                linhas.add(new LinhaExtratoBruta(data, descricao, valor, null));
            }
            return linhas;
        } catch (IOException | IllegalArgumentException | DateTimeException excecao) {
            throw new ArquivoExtratoInvalidoException(
                    "não foi possível ler o arquivo como extrato do Itaú: " + excecao.getMessage());
        }
    }

    private String localizarTabela(InputStream arquivo) {
        List<String> linhas = new ArrayList<>();
        try (BufferedReader leitor = new BufferedReader(new InputStreamReader(arquivo, StandardCharsets.UTF_8))) {
            String linha;
            while ((linha = leitor.readLine()) != null) {
                linhas.add(linha);
            }
        } catch (IOException excecao) {
            throw new ArquivoExtratoInvalidoException("não foi possível ler o arquivo enviado");
        }

        int indiceCabecalho = -1;
        for (int i = 0; i < linhas.size(); i++) {
            String linhaMinuscula = linhas.get(i).toLowerCase(Locale.ROOT);
            if (linhaMinuscula.contains("data") && linhaMinuscula.contains("valor")) {
                indiceCabecalho = i;
                break;
            }
        }

        if (indiceCabecalho == -1) {
            throw new ArquivoExtratoInvalidoException(
                    "não encontrei a linha de cabeçalho (data/valor) no extrato do Itaú");
        }

        return String.join("\n", linhas.subList(indiceCabecalho, linhas.size()));
    }

    private BigDecimal converterValor(String valorTexto) {
        String limpo = valorTexto.replaceAll("[^0-9,.-]", "")
                .replace(".", "")
                .replace(",", ".");
        return new BigDecimal(limpo);
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
