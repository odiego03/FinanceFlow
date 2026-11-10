import api from './api'

// mes no formato AAAA-MM; sem mes = mês atual
export async function listar(mes) {
  const { data } = await api.get('/sugestoes', { params: { mes: mes || undefined } })
  return data
}
