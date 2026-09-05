import api from './api'

export async function login(email, senha) {
  const { data } = await api.post('/login', { email, senha })
  return data
}
