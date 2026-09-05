import { createContext, useContext, useState } from 'react'
import { CHAVE_TOKEN } from '../services/api'
import * as usuarioService from '../services/usuarioService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(CHAVE_TOKEN))

  const entrar = async (email, senha) => {
    const resposta = await usuarioService.login(email, senha)
    localStorage.setItem(CHAVE_TOKEN, resposta.token)
    setToken(resposta.token)
  }

  const sair = () => {
    localStorage.removeItem(CHAVE_TOKEN)
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ token, autenticado: Boolean(token), entrar, sair }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const contexto = useContext(AuthContext)
  if (!contexto) {
    throw new Error('useAuth precisa ser usado dentro de um AuthProvider')
  }
  return contexto
}
