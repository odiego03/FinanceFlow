import api from './api'

export async function listar() {
  const { data } = await api.get('/metas')
  return data
}

export async function criar(meta) {
  const { data } = await api.post('/metas', meta)
  return data
}

export async function atualizar(id, meta) {
  const { data } = await api.put(`/metas/${id}`, meta)
  return data
}

export async function excluir(id) {
  await api.delete(`/metas/${id}`)
}

export async function contribuir(metaId, contribuicao) {
  const { data } = await api.post(`/metas/${metaId}/contribuicoes`, contribuicao)
  return data
}
