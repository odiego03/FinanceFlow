package com.financeflow.dto;

import com.financeflow.model.Categoria;
import com.financeflow.model.TipoMovimentacao;
import com.financeflow.service.CategoriasPredefinidas;

// essencial: valor efetivo (já resolve o padrão do catálogo pra categoria que nunca teve o campo definido)
public record CategoriaResposta(Long id, String nome, TipoMovimentacao tipo, String icone, String cor, boolean essencial) {

    public static CategoriaResposta de(Categoria categoria) {
        return new CategoriaResposta(categoria.getId(), categoria.getNome(), categoria.getTipo(),
                categoria.getIcone(), categoria.getCor(), CategoriasPredefinidas.ehEssencial(categoria));
    }
}
