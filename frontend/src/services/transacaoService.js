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
