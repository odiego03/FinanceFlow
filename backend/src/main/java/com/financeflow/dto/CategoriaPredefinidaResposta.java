package com.financeflow.dto;

import com.financeflow.model.TipoMovimentacao;
import com.financeflow.service.CategoriasPredefinidas.CategoriaPredefinidaModelo;

public record CategoriaPredefinidaResposta(String nome, TipoMovimentacao tipo, String icone, String cor) {

    public static CategoriaPredefinidaResposta de(CategoriaPredefinidaModelo modelo) {
        return new CategoriaPredefinidaResposta(modelo.nome(), modelo.tipo(), modelo.icone(), modelo.cor());
    }
}
