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

export async function atualizarNome(nome) {
  const { data } = await api.put('/usuarios/me', { nome })
  return data
}

export async function trocarSenha(senhaAtual, novaSenha) {
  await api.put('/usuarios/me/senha', { senhaAtual, novaSenha })
}

// Sempre 204, exista a conta ou não: o backend manda o código só se o email tiver conta
export async function solicitarCodigoRedefinicao(email) {
  await api.post('/senha/esqueci', { email })
}

export async function redefinirSenha(email, codigo, novaSenha) {
  await api.post('/senha/redefinir', { email, codigo, novaSenha })
}

export async function buscarPreferencias() {
  const { data } = await api.get('/usuarios/me/preferencias')
  return data
}

export async function salvarPreferencias(preferencias) {
  const { data } = await api.put('/usuarios/me/preferencias', preferencias)
  return data
}

export async function marcarTutorial(concluido) {
  const { data } = await api.put('/usuarios/me/preferencias/tutorial', { concluido })
  return data
}
