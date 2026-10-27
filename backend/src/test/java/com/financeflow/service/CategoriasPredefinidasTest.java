package com.financeflow.service;

import com.financeflow.model.Categoria;
import com.financeflow.model.TipoMovimentacao;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CategoriasPredefinidasTest {

    private Categoria categoria(String nome, TipoMovimentacao tipo, Boolean essencial) {
        Categoria categoria = new Categoria();
        categoria.setNome(nome);
        categoria.setTipo(tipo);
        categoria.setEssencial(essencial);
        return categoria;
    }

    @Test
    void semValorDefinidoUsaOPadraoDoCatalogo() {
        assertThat(CategoriasPredefinidas.ehEssencial(categoria("Moradia", TipoMovimentacao.DESPESA, null))).isTrue();
        assertThat(CategoriasPredefinidas.ehEssencial(categoria(" alimentação ", TipoMovimentacao.DESPESA, null))).isTrue();
        assertThat(CategoriasPredefinidas.ehEssencial(categoria("Lazer", TipoMovimentacao.DESPESA, null))).isFalse();
        assertThat(CategoriasPredefinidas.ehEssencial(categoria("Academia", TipoMovimentacao.DESPESA, null))).isFalse();
    }

    @Test
    void valorDefinidoPeloUsuarioPrevaleceSobreOCatalogo() {
        assertThat(CategoriasPredefinidas.ehEssencial(categoria("Moradia", TipoMovimentacao.DESPESA, false))).isFalse();
        assertThat(CategoriasPredefinidas.ehEssencial(categoria("Academia", TipoMovimentacao.DESPESA, true))).isTrue();
    }

    @Test
    void receitaNuncaEEssencial() {
        assertThat(CategoriasPredefinidas.ehEssencial(categoria("Salário", TipoMovimentacao.RECEITA, true))).isFalse();
    }
}
