import api from './api'

export async function listar() {
  const { data } = await api.get('/categorias')
  return data
}

export async function criar(categoria) {
  const { data } = await api.post('/categorias', categoria)
  return data
}

export async function atualizar(id, categoria) {
  const { data } = await api.put(`/categorias/${id}`, categoria)
  return data
}

export async function excluir(id) {
  await api.delete(`/categorias/${id}`)
}

export async function listarPredefinidas() {
  const { data } = await api.get('/categorias/predefinidas')
  return data
}

export async function adicionarPredefinidas() {
  const { data } = await api.post('/categorias/predefinidas')
  return data
}
