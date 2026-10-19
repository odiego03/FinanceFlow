package com.financeflow.service.extrato;

import com.financeflow.exception.ArquivoExtratoInvalidoException;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Layout assumido do extrato de conta do Nubank: colunas "Data", "Valor",
 * "Descrição" (nomes exatos a confirmar contra um arquivo real exportado —
 * ver "Risco conhecido" no plano da Sprint#3), separador vírgula, UTF-8,
 * data AAAA-MM-DD, valor decimal com ponto (negativo = saída/despesa).
 */
@Component
public class NubankExtratoParser implements ExtratoParser {

    private static final DateTimeFormatter FORMATO_DATA = DateTimeFormatter.ISO_LOCAL_DATE;

    @Override
    public List<LinhaExtratoBruta> parsear(InputStream arquivo) {
        CSVFormat formato = CSVFormat.DEFAULT.builder()
                .setHeader()
                .setSkipHeaderRecord(true)
                .setIgnoreHeaderCase(true)
                .setTrim(true)
                .build();

        try (CSVParser parser = formato.parse(new InputStreamReader(arquivo, StandardCharsets.UTF_8))) {
            List<LinhaExtratoBruta> linhas = new ArrayList<>();
            for (CSVRecord registro : parser) {
                LocalDate data = LocalDate.parse(campo(registro, "Data", "data"), FORMATO_DATA);
                String descricao = campo(registro, "Descrição", "Descricao", "descricao");
                BigDecimal valor = new BigDecimal(campo(registro, "Valor", "valor"));
                linhas.add(new LinhaExtratoBruta(data, descricao, valor));
            }
            return linhas;
        } catch (IOException | IllegalArgumentException excecao) {
            throw new ArquivoExtratoInvalidoException(
                    "não foi possível ler o arquivo como extrato do Nubank: " + excecao.getMessage());
        }
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
