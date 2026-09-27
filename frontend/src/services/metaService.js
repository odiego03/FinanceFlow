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

export async function registrarAporte(metaId, aporte) {
  const { data } = await api.post(`/metas/${metaId}/aportes`, aporte)
  return data
}

export async function excluirAporte(metaId, aporteId) {
  await api.delete(`/metas/${metaId}/aportes/${aporteId}`)
}
