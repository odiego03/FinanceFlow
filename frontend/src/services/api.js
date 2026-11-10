import axios from 'axios'

export const CHAVE_TOKEN = 'financeflow.token'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(CHAVE_TOKEN)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const CHAVE_SESSAO_EXPIRADA = 'financeflow.sessaoExpirada'

// 401 numa rota autenticada = token expirou ou ficou inválido: limpa e volta pro login.
// Recarrega a página de propósito, pra zerar todo o estado (AuthContext incluso) sem acoplar o axios ao React.
api.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    const tinhaToken = Boolean(erro.config?.headers?.Authorization)
    if (erro.response?.status === 401 && tinhaToken) {
      localStorage.removeItem(CHAVE_TOKEN)
      try {
        sessionStorage.setItem(CHAVE_SESSAO_EXPIRADA, '1')
      } catch {
        // sem sessionStorage só não aparece o aviso no login
      }
      window.location.assign('/login')
    }
    return Promise.reject(erro)
  },
)

// Mensagem que o backend manda em {"mensagem": "..."}; num 400 de validação vem {"campo": "motivo"}, e aí junta os
// motivos. Sem nada disso, o texto padrão da tela
export function mensagemDeErro(erro, padrao) {
  const dados = erro?.response?.data
  if (dados?.mensagem) {
    return dados.mensagem
  }
  if (erro?.response?.status === 400 && dados && typeof dados === 'object') {
    const motivos = Object.values(dados).filter((motivo) => typeof motivo === 'string')
    if (motivos.length > 0) {
      const texto = motivos.join('; ')
      return texto.charAt(0).toUpperCase() + texto.slice(1)
    }
  }
  return padrao
}

export default api
