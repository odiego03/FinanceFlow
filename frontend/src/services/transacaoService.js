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

export async function evolucaoMensal(meses) {
  const { data } = await api.get('/transacoes/evolucao-mensal', { params: { meses } })
  return data
}

// mes no formato AAAA-MM; sem mes = todo o período
export async function totaisPorCategoria(tipo, mes) {
  const { data } = await api.get('/transacoes/por-categoria', { params: { tipo, mes: mes || undefined } })
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
