// Metas ainda não concluídas que têm alguma receita (entre as transações informadas) numa das categorias delas
export function agruparReceitasPorMeta(transacoes, metas) {
  return metas
    .map((meta) => ({
      meta,
      restante: Math.max(0, Number(meta.valorAlvo) - Number(meta.valorAtual)),
      receitas: transacoes.filter((transacao) => transacao.tipo === 'RECEITA' && meta.categoriaIds.includes(transacao.categoriaId)),
    }))
    .filter((grupo) => grupo.restante > 0 && grupo.receitas.length > 0)
}
