import api from './api'

export async function simular(simulacao) {
  const { data } = await api.post('/simulacoes', simulacao)
  return data
}

export async function taxas() {
  const { data } = await api.get('/simulacoes/taxas')
  return data
}
