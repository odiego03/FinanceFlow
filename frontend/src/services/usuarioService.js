import api from './api'

export async function login(email, senha) {
  const { data } = await api.post('/login', { email, senha })
  return data
}

export async function cadastrar(nome, email, senha) {
  const { data } = await api.post('/usuarios', { nome, email, senha })
  return data
}

export async function buscarUsuarioAtual() {
  const { data } = await api.get('/usuarios/me')
  return data
}
