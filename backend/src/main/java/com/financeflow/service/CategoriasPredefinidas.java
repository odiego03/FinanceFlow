package com.financeflow.service;

import com.financeflow.model.TipoMovimentacao;

import java.util.List;

public final class CategoriasPredefinidas {

    public record CategoriaPredefinidaModelo(String nome, TipoMovimentacao tipo, String icone, String cor) {
    }

    public static final List<CategoriaPredefinidaModelo> CATALOGO = List.of(
            new CategoriaPredefinidaModelo("Alimentação", TipoMovimentacao.DESPESA, "cup-hot-fill", "#f97316"),
            new CategoriaPredefinidaModelo("Moradia", TipoMovimentacao.DESPESA, "house-door-fill", "#0ea5e9"),
            new CategoriaPredefinidaModelo("Transporte", TipoMovimentacao.DESPESA, "car-front-fill", "#6366f1"),
            new CategoriaPredefinidaModelo("Saúde", TipoMovimentacao.DESPESA, "heart-pulse-fill", "#ec4899"),
            new CategoriaPredefinidaModelo("Educação", TipoMovimentacao.DESPESA, "book-fill", "#8b5cf6"),
            new CategoriaPredefinidaModelo("Lazer", TipoMovimentacao.DESPESA, "controller", "#14b8a6"),
            new CategoriaPredefinidaModelo("Contas e Serviços", TipoMovimentacao.DESPESA, "receipt", "#64748b"),
            new CategoriaPredefinidaModelo("Compras", TipoMovimentacao.DESPESA, "bag-fill", "#f43f5e"),
            new CategoriaPredefinidaModelo("Assinaturas", TipoMovimentacao.DESPESA, "collection-play-fill", "#a855f7"),
            new CategoriaPredefinidaModelo("Viagem", TipoMovimentacao.DESPESA, "airplane-fill", "#0891b2"),
            new CategoriaPredefinidaModelo("Pets", TipoMovimentacao.DESPESA, "heart-fill", "#d946ef"),
            new CategoriaPredefinidaModelo("Impostos e Taxas", TipoMovimentacao.DESPESA, "bank", "#78716c"),
            new CategoriaPredefinidaModelo("Salário", TipoMovimentacao.RECEITA, "cash-coin", "#16a34a"),
            new CategoriaPredefinidaModelo("Investimentos", TipoMovimentacao.RECEITA, "graph-up-arrow", "#22c55e"),
            new CategoriaPredefinidaModelo("Freelance", TipoMovimentacao.RECEITA, "laptop-fill", "#059669"),
            new CategoriaPredefinidaModelo("Presentes", TipoMovimentacao.RECEITA, "gift-fill", "#0d9488"),
            new CategoriaPredefinidaModelo("Reembolsos", TipoMovimentacao.RECEITA, "arrow-counterclockwise", "#65a30d"),
            new CategoriaPredefinidaModelo("Outras Receitas", TipoMovimentacao.RECEITA, "plus-circle-fill", "#10b981")
    );

    private CategoriasPredefinidas() {
    }
}
