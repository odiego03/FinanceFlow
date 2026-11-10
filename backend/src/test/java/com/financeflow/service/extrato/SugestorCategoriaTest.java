package com.financeflow.service.extrato;

import com.financeflow.model.TipoMovimentacao;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SugestorCategoriaTest {

    private final SugestorCategoria sugestor = new SugestorCategoria();

    @Test
    void chaveDePixIgnoraCpfBancoEConta() {
        String contaA = "Transferência enviada pelo Pix - João da Silva - •••.123.456-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 1111111-1";
        String contaB = "Transferência enviada pelo Pix - JOÃO DA SILVA - •••.123.456-•• - BCO DO BRASIL S.A. (0001) Agência: 2 Conta: 2222-2";

        assertThat(sugestor.chaveDe(contaA))
                .isEqualTo("TRANSFERENCIA ENVIADA PELO PIX - JOAO DA SILVA")
                .isEqualTo(sugestor.chaveDe(contaB));
    }

    @Test
    void chaveDePixParaEmpresaIgnoraCnpj() {
        assertThat(sugestor.chaveDe("Transferência enviada pelo Pix - EMPRESA EXEMPLO LTDA - 12.345.678/0001-90 - BCO SANTANDER (BRASIL) S.A. (0033) Agência: 1 Conta: 1-1"))
                .isEqualTo("TRANSFERENCIA ENVIADA PELO PIX - EMPRESA EXEMPLO LTDA");
    }

    @Test
    void chaveSeparaEnviadaDeRecebidaProMesmoFavorecido() {
        String enviada = "Transferência enviada pelo Pix - João da Silva - •••.123.456-•• - NU PAGAMENTOS - IP (0260)";
        String recebida = "Transferência Recebida - João da Silva - •••.123.456-•• - NU PAGAMENTOS - IP (0260)";

        assertThat(sugestor.chaveDe(enviada)).isNotEqualTo(sugestor.chaveDe(recebida));
    }

    @Test
    void chaveSemDadosDeBancoFicaInteira() {
        assertThat(sugestor.chaveDe("Compra no débito via NuPay - iFood")).isEqualTo("COMPRA NO DEBITO VIA NUPAY - IFOOD");
        assertThat(sugestor.chaveDe("Pagamento de fatura")).isEqualTo("PAGAMENTO DE FATURA");
    }

    @Test
    void chaveRemoveDataNoFim() {
        assertThat(sugestor.chaveDe("PIX TRANSF FULANO 12/09")).isEqualTo(sugestor.chaveDe("PIX TRANSF FULANO 19/09"));
    }

    @Test
    void sugereCategoriaPorPalavraChave() {
        assertThat(sugerir("Compra no débito via NuPay - iFood", TipoMovimentacao.DESPESA)).isEqualTo("Alimentação");
        assertThat(sugerir("Compra no débito via NuPay - 99", TipoMovimentacao.DESPESA)).isEqualTo("Transporte");
        assertThat(sugerir("Compra no débito - MINI MERCADO EXEMPLO L", TipoMovimentacao.DESPESA)).isEqualTo("Alimentação");
        assertThat(sugerir("Compra no débito - AUTOPASS S.A*ATM TMOB", TipoMovimentacao.DESPESA)).isEqualTo("Transporte");
        assertThat(sugerir("Estorno - Compra no débito - AUTOPASS S.A*ATM TMOB", TipoMovimentacao.RECEITA)).isEqualTo("Reembolsos");
        assertThat(sugerir("Compra no débito - MERCADO LIVRE", TipoMovimentacao.DESPESA)).isEqualTo("Compras");
    }

    @Test
    void naoUsaNomeDoBancoDoFavorecidoPraSugerir() {
        String pixViaMercadoPago = "Transferência enviada pelo Pix - Fulano de Tal - •••.123.456-•• - MERCADO PAGO IP LTDA. (0323) Agência: 1 Conta: 1-1";

        assertThat(sugestor.sugerirNomeCategoria(sugestor.chaveDe(pixViaMercadoPago), TipoMovimentacao.DESPESA)).isEmpty();
    }

    @Test
    void naoSugereCategoriaDeOutroTipo() {
        assertThat(sugestor.sugerirNomeCategoria(sugestor.chaveDe("Compra no débito via NuPay - iFood"), TipoMovimentacao.RECEITA))
                .isEmpty();
    }

    @Test
    void semPalavraChaveFicaSemSugestao() {
        assertThat(sugestor.sugerirNomeCategoria(sugestor.chaveDe("Pagamento de fatura"), TipoMovimentacao.DESPESA)).isEmpty();
    }

    private String sugerir(String descricao, TipoMovimentacao tipo) {
        return sugestor.sugerirNomeCategoria(sugestor.chaveDe(descricao), tipo).orElseThrow();
    }
}
