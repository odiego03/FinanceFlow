const formatadorData = new Intl.DateTimeFormat('pt-BR')
const formatadorDecimal = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Uma linha por transação, da mais antiga pra mais nova; despesa sai com valor negativo
export function linhasDeTransacoes(transacoes) {
  return [...transacoes]
    .sort((a, b) => a.data.localeCompare(b.data))
    .map((t) => [
      formatadorData.format(new Date(`${t.data}T00:00:00`)),
      t.tipo === 'RECEITA' ? 'Receita' : 'Despesa',
      t.categoriaNome,
      t.descricao ?? '',
      formatadorDecimal.format(t.tipo === 'RECEITA' ? t.valor : -t.valor),
    ])
}

export const CABECALHO_TRANSACOES = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor']

// ";" e vírgula decimal pro Excel em português abrir em colunas; o BOM faz ele ler os acentos como UTF-8
export function baixarCsv(nomeArquivo, linhas) {
  const conteudo = linhas
    .map((colunas) => colunas.map((coluna) => `"${String(coluna).replaceAll('"', '""')}"`).join(';'))
    .join('\r\n')
  const arquivo = new Blob([`﻿${conteudo}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(arquivo)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  link.click()
  URL.revokeObjectURL(url)
}
