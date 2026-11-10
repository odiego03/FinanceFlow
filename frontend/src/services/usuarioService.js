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

// Sempre 204, exista a conta ou não: o backend manda o código só se o email tiver conta
export async function solicitarCodigoRedefinicao(email) {
  await api.post('/senha/esqueci', { email })
}

// 204 se o código confere; só confere, a senha só muda em redefinirSenha
export async function verificarCodigoRedefinicao(email, codigo) {
  await api.post('/senha/verificar', { email, codigo })
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

// 204 se o link do e-mail é válido; 400 se inválido, expirado ou já usado
export async function confirmarEmail(token) {
  await api.post('/usuarios/confirmar-email', { token })
}

// Sempre 204, exista a conta ou não (e já confirmada ou não): o backend só manda o e-mail se for o caso
export async function reenviarConfirmacao(email) {
  await api.post('/usuarios/reenviar-confirmacao', { email })
}
