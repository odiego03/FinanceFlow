package com.financeflow.dto;

import com.financeflow.model.Categoria;
import com.financeflow.model.TipoMovimentacao;

public record CategoriaResposta(Long id, String nome, TipoMovimentacao tipo) {

    public static CategoriaResposta de(Categoria categoria) {
        return new CategoriaResposta(categoria.getId(), categoria.getNome(), categoria.getTipo());
    }
}
