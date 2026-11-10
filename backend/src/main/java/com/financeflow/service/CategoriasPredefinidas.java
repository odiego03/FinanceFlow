package com.financeflow.service;

import com.financeflow.model.Categoria;
import com.financeflow.model.TipoMovimentacao;

import java.util.List;
import java.util.Locale;

public final class CategoriasPredefinidas {

    public record CategoriaPredefinidaModelo(String nome, TipoMovimentacao tipo, String icone, String cor,
                                             boolean essencial) {
    }

    // essencial = necessidade básica na regra 50/30/20 (usado pelo Indicador de comprometimento de renda)
    public static final List<CategoriaPredefinidaModelo> CATALOGO = List.of(
            new CategoriaPredefinidaModelo("Alimentação", TipoMovimentacao.DESPESA, "cup-hot-fill", "#f97316", true),
            new CategoriaPredefinidaModelo("Moradia", TipoMovimentacao.DESPESA, "house-door-fill", "#0ea5e9", true),
            new CategoriaPredefinidaModelo("Transporte", TipoMovimentacao.DESPESA, "car-front-fill", "#6366f1", true),
            new CategoriaPredefinidaModelo("Saúde", TipoMovimentacao.DESPESA, "heart-pulse-fill", "#ec4899", true),
            new CategoriaPredefinidaModelo("Educação", TipoMovimentacao.DESPESA, "book-fill", "#8b5cf6", true),
            new CategoriaPredefinidaModelo("Lazer", TipoMovimentacao.DESPESA, "controller", "#14b8a6", false),
            new CategoriaPredefinidaModelo("Contas e Serviços", TipoMovimentacao.DESPESA, "receipt", "#64748b", true),
            new CategoriaPredefinidaModelo("Compras", TipoMovimentacao.DESPESA, "bag-fill", "#f43f5e", false),
            new CategoriaPredefinidaModelo("Assinaturas", TipoMovimentacao.DESPESA, "collection-play-fill", "#a855f7", false),
            new CategoriaPredefinidaModelo("Viagem", TipoMovimentacao.DESPESA, "airplane-fill", "#0891b2", false),
            new CategoriaPredefinidaModelo("Pets", TipoMovimentacao.DESPESA, "heart-fill", "#d946ef", false),
            new CategoriaPredefinidaModelo("Impostos e Taxas", TipoMovimentacao.DESPESA, "bank", "#78716c", true),
            new CategoriaPredefinidaModelo("Salário", TipoMovimentacao.RECEITA, "cash-coin", "#16a34a", false),
            new CategoriaPredefinidaModelo("Investimentos", TipoMovimentacao.RECEITA, "graph-up-arrow", "#22c55e", false),
            new CategoriaPredefinidaModelo("Freelance", TipoMovimentacao.RECEITA, "laptop-fill", "#059669", false),
            new CategoriaPredefinidaModelo("Presentes", TipoMovimentacao.RECEITA, "gift-fill", "#0d9488", false),
            new CategoriaPredefinidaModelo("Reembolsos", TipoMovimentacao.RECEITA, "arrow-counterclockwise", "#65a30d", false),
            new CategoriaPredefinidaModelo("Outras Receitas", TipoMovimentacao.RECEITA, "plus-circle-fill", "#10b981", false)
    );

    private CategoriasPredefinidas() {
    }

    /*
     * Valor efetivo de "essencial": receita nunca é; despesa usa o que o usuário marcou e, se nunca marcou
     * (categoria anterior ao campo), o padrão da pré-definida de mesmo nome. Sem migração de dados.
     */
    public static boolean ehEssencial(Categoria categoria) {
        if (categoria.getTipo() != TipoMovimentacao.DESPESA) {
            return false;
        }
        if (categoria.getEssencial() != null) {
            return categoria.getEssencial();
        }
        String nome = categoria.getNome().trim().toLowerCase(Locale.ROOT);
        return CATALOGO.stream()
                .anyMatch(modelo -> modelo.essencial() && modelo.tipo() == TipoMovimentacao.DESPESA
                        && modelo.nome().toLowerCase(Locale.ROOT).equals(nome));
    }
}
