import api from './api'

export async function simular(simulacao) {
  const { data } = await api.post('/simulacoes', simulacao)
  return data
}

export async function taxas() {
  const { data } = await api.get('/simulacoes/taxas')
  return data
}

// Modo meta: quanto investir por mês em cada investimento pra chegar no valor no prazo
export async function aporteNecessario(pedido) {
  const { data } = await api.post('/simulacoes/aporte-necessario', pedido)
  return data
}
