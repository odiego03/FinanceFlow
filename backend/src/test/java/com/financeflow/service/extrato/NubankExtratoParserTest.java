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

class NubankExtratoParserTest {

    private final NubankExtratoParser parser = new NubankExtratoParser();

    @Test
    void leExtratoNoFormatoRealDoNubank() {
        String csv = """
                Data,Valor,Identificador,Descrição
                02/09/2026,399.04,6a980631-1e99-45eb-a200-24a15a02c484,Transferência recebida pelo Pix - EMPRESA EXEMPLO LTDA
                02/09/2026,-29,6a98c935-2d78-4ec9-b150-7d556b5b818a,Transferência enviada pelo Pix - Fulano de Tal
                11/09/2026,-15.98,6aa42e79-f050-4ef4-ac28-35b6c101b285,Compra no débito via NuPay - iFood
                """;

        List<LinhaExtratoBruta> linhas = parser.parsear(arquivo(csv));

        assertThat(linhas).containsExactly(
                new LinhaExtratoBruta(LocalDate.of(2026, 9, 2),
                        "Transferência recebida pelo Pix - EMPRESA EXEMPLO LTDA", new BigDecimal("399.04"),
                        "6a980631-1e99-45eb-a200-24a15a02c484"),
                new LinhaExtratoBruta(LocalDate.of(2026, 9, 2),
                        "Transferência enviada pelo Pix - Fulano de Tal", new BigDecimal("-29"),
                        "6a98c935-2d78-4ec9-b150-7d556b5b818a"),
                new LinhaExtratoBruta(LocalDate.of(2026, 9, 11),
                        "Compra no débito via NuPay - iFood", new BigDecimal("-15.98"),
                        "6aa42e79-f050-4ef4-ac28-35b6c101b285"));
    }

    @Test
    void extratoSemColunaIdentificadorTemIdentificadorNulo() {
        String csv = "Data,Valor,Descrição\n02/09/2026,10,Teste\n";

        assertThat(parser.parsear(arquivo(csv)).get(0).identificador()).isNull();
    }

    @Test
    void aceitaDescricaoComVirgulaEntreAspas() {
        String csv = """
                Data,Valor,Identificador,Descrição
                08/09/2026,-710.65,6a9f2a92-a8c1-4e6f-b8e4-38dd94477245,"Pagamento de boleto efetuado - LOJA, FILIAL 2"
                """;

        assertThat(parser.parsear(arquivo(csv)).get(0).descricao())
                .isEqualTo("Pagamento de boleto efetuado - LOJA, FILIAL 2");
    }

    @Test
    void ignoraBomNoInicioDoArquivo() {
        String csv = "﻿Data,Valor,Identificador,Descrição\n18/09/2026,-2055.48,6aad8a8b,Pagamento de fatura\n";

        assertThat(parser.parsear(arquivo(csv))).hasSize(1);
    }

    @Test
    void detectaSeparadorTabEPontoEVirgula() {
        String comTab = "Data\tValor\tIdentificador\tDescrição\n19/09/2026\t5\tabc\tEstorno - Compra no débito\n";
        String comPontoEVirgula = "Data;Valor;Identificador;Descrição\n19/09/2026;5;abc;Estorno - Compra no débito\n";

        assertThat(parser.parsear(arquivo(comTab)).get(0).valorComSinal()).isEqualByComparingTo("5");
        assertThat(parser.parsear(arquivo(comPontoEVirgula)).get(0).valorComSinal()).isEqualByComparingTo("5");
    }

    @Test
    void aceitaDataIso() {
        String csv = "Data,Valor,Identificador,Descrição\n2026-09-02,10,abc,Teste\n";

        assertThat(parser.parsear(arquivo(csv)).get(0).data()).isEqualTo(LocalDate.of(2026, 9, 2));
    }

    @Test
    void dataInvalidaViraErroDeArquivoComNumeroDaLinha() {
        String csv = "Data,Valor,Identificador,Descrição\n02/09/2026,10,abc,Ok\n31/02/2026x,10,def,Quebrada\n";

        assertThatThrownBy(() -> parser.parsear(arquivo(csv)))
                .isInstanceOf(ArquivoExtratoInvalidoException.class)
                .hasMessageContaining("linha 3");
    }

    @Test
    void colunaFaltandoViraErroDeArquivo() {
        String csv = "date,title,amount\n2026-09-02,iFood,15.98\n";

        assertThatThrownBy(() -> parser.parsear(arquivo(csv)))
                .isInstanceOf(ArquivoExtratoInvalidoException.class)
                .hasMessageContaining("coluna não encontrada");
    }

    private InputStream arquivo(String conteudo) {
        return new ByteArrayInputStream(conteudo.getBytes(StandardCharsets.UTF_8));
    }
}
