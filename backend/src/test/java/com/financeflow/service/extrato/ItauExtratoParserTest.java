package com.financeflow.service.extrato;

import com.financeflow.exception.ArquivoExtratoInvalidoException;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ItauExtratoParserTest {

    private final ItauExtratoParser parser = new ItauExtratoParser();

    @Test
    void pulaOsMetadadosEConverteValorComVirgula() {
        String csv = """
                Extrato de conta corrente
                Agência: 1234 Conta: 56789-0
                data;lançamento;valor
                05/09/2026;PIX RECEBIDO FULANO;1.250,50
                06/09/2026;PADARIA DO ZE;-12,90
                """;

        List<LinhaExtratoBruta> linhas = parser.parsear(arquivo(csv));

        assertThat(linhas).containsExactly(
                new LinhaExtratoBruta(LocalDate.of(2026, 9, 5), "PIX RECEBIDO FULANO", new BigDecimal("1250.50"), null),
                new LinhaExtratoBruta(LocalDate.of(2026, 9, 6), "PADARIA DO ZE", new BigDecimal("-12.90"), null));
    }

    @Test
    void aceitaNomesAlternativosDeColuna() {
        String csv = """
                Data;Histórico;Valor (R$)
                10/09/2026;TARIFA;-5,00
                """;

        assertThat(parser.parsear(arquivo(csv)))
                .containsExactly(new LinhaExtratoBruta(LocalDate.of(2026, 9, 10), "TARIFA", new BigDecimal("-5.00"), null));
    }

    @Test
    void semCabecalhoDeDataEValorDaErroClaro() {
        assertThatThrownBy(() -> parser.parsear(arquivo("qualquer;coisa\n1;2\n")))
                .isInstanceOf(ArquivoExtratoInvalidoException.class)
                .hasMessageContaining("cabeçalho");
    }

    @Test
    void dataInvalidaDaErroDeArquivo() {
        String csv = """
                data;lançamento;valor
                2026-09-01;ALGO;-1,00
                """;

        assertThatThrownBy(() -> parser.parsear(arquivo(csv))).isInstanceOf(ArquivoExtratoInvalidoException.class);
    }

    private static final String OFX_ITAU = """
            OFXHEADER:100
            DATA:OFXSGML
            VERSION:102
            SECURITY:NONE
            ENCODING:USASCII
            CHARSET:1252
            COMPRESSION:NONE
            OLDFILEUID:NONE
            NEWFILEUID:NONE

            <OFX>
            <SIGNONMSGSRSV1><SONRS><STATUS><CODE>0<SEVERITY>INFO</STATUS><DTSERVER>20261110155627</SONRS></SIGNONMSGSRSV1>
            <BANKMSGSRSV1><STMTTRNRS><STMTRS>
            <CURDEF>BRL
            <BANKTRANLIST>
            <DTSTART>20261026
            <DTEND>20261109
            <STMTTRN>
            <TRNTYPE>DEBIT
            <DTPOSTED>20261029000000[-3:BRT]
            <TRNAMT>-8.00
            <FITID>20261029001
            <MEMO>RSCSS RZ BUFFET A 2910
            </STMTTRN>
            <STMTTRN>
            <TRNTYPE>CREDIT
            <DTPOSTED>20261109
            <TRNAMT>700.00
            <FITID>20261109002
            <MEMO>PIX TRANSF THIAGO 09/11
            </STMTTRN>
            <STMTTRN>
            <TRNTYPE>DEBIT
            <DTPOSTED>20261109
            <TRNAMT>-15,00
            <MEMO>PIX TRANSF Jonatha09/11
            </STMTTRN>
            </BANKTRANLIST>
            <LEDGERBAL><BALAMT>1294.04<DTASOF>20261109</LEDGERBAL>
            </STMTRS></STMTTRNRS></BANKMSGSRSV1>
            </OFX>
            """;

    @Test
    void leOfxDoItauComValorSinalizadoEIgnoraSaldos() {
        List<LinhaExtratoBruta> linhas = parser.parsear(arquivo(OFX_ITAU));

        assertThat(linhas).containsExactly(
                new LinhaExtratoBruta(LocalDate.of(2026, 10, 29), "RSCSS RZ BUFFET A 2910", new BigDecimal("-8.00"), null),
                new LinhaExtratoBruta(LocalDate.of(2026, 11, 9), "PIX TRANSF THIAGO 09/11", new BigDecimal("700.00"), null),
                new LinhaExtratoBruta(LocalDate.of(2026, 11, 9), "PIX TRANSF Jonatha09/11", new BigDecimal("-15.00"), null));
    }

    @Test
    void leOfxEmXmlComTagsFechadas() {
        String ofx = """
                <?xml version="1.0" encoding="UTF-8"?>
                <OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
                <STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20261106120000</DTPOSTED><TRNAMT>-15.14</TRNAMT><MEMO>PAY DIA B &amp; CIA 06/11</MEMO></STMTTRN>
                </BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>
                """;

        assertThat(parser.parsear(arquivo(ofx))).containsExactly(
                new LinhaExtratoBruta(LocalDate.of(2026, 11, 6), "PAY DIA B & CIA 06/11", new BigDecimal("-15.14"), null));
    }

    @Test
    void ofxEmWindows1252PreservaAcentos() {
        String ofx = OFX_ITAU.replace("PIX TRANSF THIAGO 09/11", "TRANSFERÊNCIA JOÃO");

        List<LinhaExtratoBruta> linhas = parser.parsear(new ByteArrayInputStream(ofx.getBytes(java.nio.charset.Charset.forName("windows-1252"))));

        assertThat(linhas).extracting(LinhaExtratoBruta::descricao).contains("TRANSFERÊNCIA JOÃO");
    }

    @Test
    void ofxSemLancamentosDevolveListaVazia() {
        assertThat(parser.parsear(arquivo("<OFX><BANKTRANLIST></BANKTRANLIST></OFX>"))).isEmpty();
    }

    @Test
    void ofxComLancamentoSemValorDaErroClaro() {
        String ofx = "<OFX><BANKTRANLIST><STMTTRN><DTPOSTED>20261109<MEMO>X</STMTTRN></BANKTRANLIST></OFX>";

        assertThatThrownBy(() -> parser.parsear(arquivo(ofx)))
                .isInstanceOf(ArquivoExtratoInvalidoException.class)
                .hasMessageContaining("sem data ou valor");
    }

    @Test
    void csvIgnoraLinhasDeSaldoSemValor() {
        String csv = """
                data;lançamento;ag./origem;valor (R$);saldos (R$)
                lançamentos;;;;
                26/10/2026;SALDO ANTERIOR;;;761,68
                29/10/2026;RSCSS RZ BUFFET A 2910;;-8,00;
                29/10/2026;SALDO TOTAL DISPONÍVEL DIA;;;753,68
                """;

        assertThat(parser.parsear(arquivo(csv))).hasSize(1);
    }

    @Test
    void xlsDoExcelEhRecusadoComOrientacao() {
        byte[] xls = {(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1, 0, 0};

        assertThatThrownBy(() -> parser.parsear(new ByteArrayInputStream(xls)))
                .isInstanceOf(ArquivoExtratoInvalidoException.class)
                .hasMessageContaining("OFX");
    }

    @Test
    void xlsEmHtmlTambemEhRecusadoComOrientacao() {
        String html = "<html><body><table><tr><td>data</td><td>valor</td></tr></table></body></html>";

        assertThatThrownBy(() -> parser.parsear(arquivo(html)))
                .isInstanceOf(ArquivoExtratoInvalidoException.class)
                .hasMessageContaining("OFX");
    }

    private InputStream arquivo(String conteudo) {
        return new ByteArrayInputStream(conteudo.getBytes(StandardCharsets.UTF_8));
    }
}
