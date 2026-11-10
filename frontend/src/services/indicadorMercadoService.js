import api from './api'

export async function obterIndicadores() {
  const { data } = await api.get('/indicadores/mercado')
  return data
}
