import api from './api'

// mes no formato AAAA-MM
export async function buscar(mes) {
  const { data } = await api.get('/indicadores/comprometimento', { params: { mes } })
  return data
}
