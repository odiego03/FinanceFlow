import api from './api'

// dataInicio/dataFim em AAAA-MM-DD; vazio = sem limite daquele lado
function parametros(dataInicio, dataFim) {
  return { params: { dataInicio: dataInicio || undefined, dataFim: dataFim || undefined } }
}

export async function previa(dataInicio, dataFim) {
  const { data } = await api.get('/transacoes/exclusao-em-massa/previa', parametros(dataInicio, dataFim))
  return data
}

export async function excluir(dataInicio, dataFim) {
  const { data } = await api.delete('/transacoes/exclusao-em-massa', parametros(dataInicio, dataFim))
  return data
}
