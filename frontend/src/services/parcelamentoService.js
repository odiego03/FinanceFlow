import api from './api'

export async function listar() {
  const { data } = await api.get('/parcelamentos')
  return data
}

export async function criar(parcelamento) {
  const { data } = await api.post('/parcelamentos', parcelamento)
  return data
}

export async function excluir(id) {
  await api.delete(`/parcelamentos/${id}`)
}

// dataPrimeiraParcela em AAAA-MM-DD; sem ela o backend usa hoje
export async function sugestao(valorTotal, dataPrimeiraParcela) {
  const { data } = await api.get('/parcelamentos/sugestao', {
    params: { valorTotal: valorTotal || undefined, dataPrimeiraParcela: dataPrimeiraParcela || undefined },
  })
  return data
}
