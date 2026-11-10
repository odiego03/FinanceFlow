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
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Extrato de conta do Itaú. Dois formatos:
 * <ul>
 *   <li><b>OFX</b> (o recomendado): o "Extrato → Salvar em OFX" do internet banking. Formato padrão de
 *       extrato bancário, com data, valor com sinal e descrição (MEMO) bem definidos em cada
 *       {@code <STMTTRN>}. Os saldos (SALDO ANTERIOR, SALDO TOTAL DISPONÍVEL DIA) não são lançamentos e
 *       não vêm como {@code STMTTRN}, então não entram.</li>
 *   <li><b>CSV</b>: layout assumido (algumas linhas de metadados antes da tabela, colunas "data",
 *       "lançamento", "valor", separador ";", data DD/MM/AAAA, valor com vírgula). Linhas sem valor, como as de
 *       saldo do extrato, são ignoradas. O Itaú também exporta .xls, que não é lido: é preciso exportar em OFX.</li>
 * </ul>
 * Os dois layouts ainda precisam ser confirmados contra um arquivo real do Itaú. O identificador fica null nos
 * dois: não confiamos que o FITID do OFX seja estável entre exportações, então a duplicata é detectada por
 * data + valor + descrição.
 */
@Component
public class ItauExtratoParser implements ExtratoParser {

    private static final DateTimeFormatter FORMATO_DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy", new Locale("pt", "BR"));
    private static final DateTimeFormatter FORMATO_DATA_OFX = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final Charset WINDOWS_1252 = Charset.forName("windows-1252");
    private static final Pattern BLOCO_TRANSACAO = Pattern.compile("<STMTTRN>(.*?)(?:</STMTTRN>|(?=<STMTTRN>)|(?=</BANKTRANLIST>)|\\z)",
            Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern CHARSET_DO_CABECALHO = Pattern.compile("CHARSET:\\s*(\\S+)", Pattern.CASE_INSENSITIVE);

    @Override
    public List<LinhaExtratoBruta> parsear(InputStream arquivo) {
        byte[] bytes;
        try {
            bytes = arquivo.readAllBytes();
        } catch (IOException excecao) {
            throw new ArquivoExtratoInvalidoException("não foi possível ler o arquivo enviado");
        }
        String conteudo = decodificar(bytes);
        if (planilhaDoExcel(bytes) || conteudo.regionMatches(true, 0, "<html", 0, 5)
                || conteudo.toLowerCase(Locale.ROOT).contains("<table")) {
            throw new ArquivoExtratoInvalidoException(
                    "esse arquivo parece o extrato .xls do Itaú, que não é suportado: baixe o extrato em OFX");
        }
        if (conteudo.toUpperCase(Locale.ROOT).contains("<OFX>")) {
            return parsearOfx(conteudo);
        }
        return parsearCsv(conteudo);
    }

    // .xls de verdade começa com a assinatura do formato binário do Excel (D0 CF 11 E0); .xlsx é um zip ("PK")
    private boolean planilhaDoExcel(byte[] bytes) {
        boolean xls = bytes.length > 4 && (bytes[0] & 0xFF) == 0xD0 && (bytes[1] & 0xFF) == 0xCF
                && (bytes[2] & 0xFF) == 0x11 && (bytes[3] & 0xFF) == 0xE0;
        boolean xlsx = bytes.length > 4 && bytes[0] == 'P' && bytes[1] == 'K';
        return xls || xlsx;
    }

    // ---------- OFX ----------

    private List<LinhaExtratoBruta> parsearOfx(String conteudo) {
        List<LinhaExtratoBruta> linhas = new ArrayList<>();
        Matcher bloco = BLOCO_TRANSACAO.matcher(conteudo);
        while (bloco.find()) {
            String transacao = bloco.group(1);
            String dataTexto = campoOfx(transacao, "DTPOSTED");
            String valorTexto = campoOfx(transacao, "TRNAMT");
            if (dataTexto == null || valorTexto == null) {
                throw new ArquivoExtratoInvalidoException("lançamento do OFX sem data ou valor");
            }
            try {
                LocalDate data = LocalDate.parse(dataTexto.substring(0, 8), FORMATO_DATA_OFX);
                linhas.add(new LinhaExtratoBruta(data, descricaoOfx(transacao), converterValorOfx(valorTexto), null));
            } catch (DateTimeException | NumberFormatException | StringIndexOutOfBoundsException excecao) {
                throw new ArquivoExtratoInvalidoException("lançamento do OFX com data ou valor inválido (data: \""
                        + dataTexto + "\", valor: \"" + valorTexto + "\")");
            }
        }
        return linhas;
    }

    // OFX 1.x é SGML (tags sem fechamento, valor até a próxima tag ou quebra de linha); OFX 2.x é XML com fechamento
    private String campoOfx(String transacao, String tag) {
        Matcher achado = Pattern.compile("<" + tag + ">([^<\\r\\n]*)", Pattern.CASE_INSENSITIVE).matcher(transacao);
        if (!achado.find()) {
            return null;
        }
        String valor = achado.group(1).trim();
        return valor.isEmpty() ? null : valor;
    }

    private String descricaoOfx(String transacao) {
        for (String tag : new String[]{"MEMO", "NAME", "TRNTYPE"}) {
            String valor = campoOfx(transacao, tag);
            if (valor != null) {
                return desescapar(valor).replaceAll("\\s+", " ").trim();
            }
        }
        return "Sem descrição";
    }

    private String desescapar(String texto) {
        return texto.replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", "\"").replace("&apos;", "'")
                .replace("&amp;", "&");
    }

    // O padrão do OFX é ponto decimal ("-8.00"), mas alguns bancos mandam vírgula
    private BigDecimal converterValorOfx(String valorTexto) {
        String limpo = valorTexto.replace(" ", "");
        if (limpo.contains(",") && !limpo.contains(".")) {
            limpo = limpo.replace(",", ".");
        }
        return new BigDecimal(limpo);
    }

    // ---------- CSV ----------

    private List<LinhaExtratoBruta> parsearCsv(String conteudo) {
        String tabelaCsv = localizarTabela(conteudo);

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
                String valorTexto = campo(registro, "valor", "valor (r$)");
                // Linhas de saldo (SALDO ANTERIOR, SALDO TOTAL DISPONÍVEL DIA) não têm valor de lançamento
                if (valorTexto.isBlank()) {
                    continue;
                }
                String descricao = campo(registro, "lançamento", "lancamento", "descrição", "descricao", "histórico", "historico");
                LocalDate data = LocalDate.parse(campo(registro, "data"), FORMATO_DATA);
                linhas.add(new LinhaExtratoBruta(data, descricao, converterValor(valorTexto), null));
            }
            return linhas;
        } catch (IOException | IllegalArgumentException | DateTimeException excecao) {
            throw new ArquivoExtratoInvalidoException(
                    "não foi possível ler o arquivo como extrato do Itaú: " + excecao.getMessage());
        }
    }

    private String localizarTabela(String conteudo) {
        List<String> linhas = conteudo.lines().toList();

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
                    "não encontrei a linha de cabeçalho (data/valor) no extrato do Itaú; prefira exportar em OFX");
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

    // ---------- Charset ----------

    // O OFX do Itaú costuma declarar CHARSET:1252 no cabeçalho; sem declaração, tenta UTF-8 e cai pro Windows-1252
    private String decodificar(byte[] bytes) {
        String inicio = new String(bytes, 0, Math.min(bytes.length, 600), StandardCharsets.ISO_8859_1);
        Matcher declarado = CHARSET_DO_CABECALHO.matcher(inicio);
        if (declarado.find()) {
            String nome = declarado.group(1);
            if (nome.equals("1252") || nome.equalsIgnoreCase("windows-1252")) {
                return semBom(new String(bytes, WINDOWS_1252));
            }
            if (nome.equals("8859-1") || nome.equalsIgnoreCase("iso-8859-1")) {
                return semBom(new String(bytes, StandardCharsets.ISO_8859_1));
            }
        }
        try {
            return semBom(StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(bytes)).toString());
        } catch (CharacterCodingException excecao) {
            return semBom(new String(bytes, WINDOWS_1252));
        }
    }

    private String semBom(String conteudo) {
        return !conteudo.isEmpty() && conteudo.charAt(0) == '﻿' ? conteudo.substring(1) : conteudo;
    }
}
