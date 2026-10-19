import api from './api'

export async function listar() {
  const { data } = await api.get('/transacoes')
  return data
}

export async function criar(transacao) {
  const { data } = await api.post('/transacoes', transacao)
  return data
}

export async function atualizar(id, transacao) {
  const { data } = await api.put(`/transacoes/${id}`, transacao)
  return data
}

export async function excluir(id) {
  await api.delete(`/transacoes/${id}`)
}

export async function evolucaoMensal() {
  const { data } = await api.get('/transacoes/evolucao-mensal')
  return data
}

export async function despesasPorCategoria() {
  const { data } = await api.get('/transacoes/despesas-por-categoria')
  return data
}

export async function importarPreview(banco, arquivo) {
  const formData = new FormData()
  formData.append('banco', banco)
  formData.append('arquivo', arquivo)
  const { data } = await api.post('/transacoes/importar/preview', formData)
  return data
}

export async function importarConfirmar(linhas) {
  const { data } = await api.post('/transacoes/importar/confirmar', { linhas })
  return data
}
