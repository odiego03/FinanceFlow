import api from './api'

// tipo MENSAL com referencia AAAA-MM, ou ANUAL com referencia AAAA
export async function gerar(tipo, referencia) {
  const { data } = await api.get('/relatorios', { params: { tipo, referencia } })
  return data
}
