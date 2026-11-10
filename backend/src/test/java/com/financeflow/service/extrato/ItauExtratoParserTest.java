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

    private InputStream arquivo(String conteudo) {
        return new ByteArrayInputStream(conteudo.getBytes(StandardCharsets.UTF_8));
    }
}
