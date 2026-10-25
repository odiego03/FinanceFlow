import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import * as usuarioService from '../services/usuarioService'

// Os mesmos padrões do backend (PreferenciasService), usados até a resposta chegar ou se ela falhar
export const PREFERENCIAS_PADRAO = {
  ocultarValores: false,
  limiteEssencial: 50,
  limiteTotal: 80,
  simuladorPercentualCdi: 100,
  simuladorPrazoMeses: 12,
}

export const VALOR_OCULTO = 'R$ •••••'

const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const PreferenciasContext = createContext(null)

export function PreferenciasProvider({ children }) {
  const { token } = useAuth()
  const [preferencias, setPreferencias] = useState(PREFERENCIAS_PADRAO)

  useEffect(() => {
    if (!token) {
      setPreferencias(PREFERENCIAS_PADRAO)
      return
    }
    usuarioService
      .buscarPreferencias()
      .then(setPreferencias)
      .catch(() => setPreferencias(PREFERENCIAS_PADRAO))
  }, [token])

  const salvar = useCallback(async (novas) => {
    const salvas = await usuarioService.salvarPreferencias(novas)
    setPreferencias(salvas)
    return salvas
  }, [])

  // Otimista: o olho responde na hora; se o backend recusar, volta ao estado anterior
  const alternarOcultarValores = useCallback(async () => {
    const anteriores = preferencias
    const novas = { ...preferencias, ocultarValores: !preferencias.ocultarValores }
    setPreferencias(novas)
    try {
      setPreferencias(await usuarioService.salvarPreferencias(novas))
    } catch {
      setPreferencias(anteriores)
    }
  }, [preferencias])

  const valor = useMemo(() => {
    const ocultarValores = preferencias.ocultarValores
    return {
      preferencias,
      salvar,
      ocultarValores,
      alternarOcultarValores,
      formatarMoeda: (numero) => (ocultarValores ? VALOR_OCULTO : formatadorMoeda.format(numero)),
      // Texto que já vem com R$ dentro (ex: mensagens das sugestões)
      ocultarValoresNoTexto: (texto) => (ocultarValores ? texto.replace(/R\$\s?-?[\d.,]+/g, VALOR_OCULTO) : texto),
    }
  }, [preferencias, salvar, alternarOcultarValores])

  return <PreferenciasContext.Provider value={valor}>{children}</PreferenciasContext.Provider>
}

export function usePreferencias() {
  const contexto = useContext(PreferenciasContext)
  if (!contexto) {
    throw new Error('usePreferencias precisa ser usado dentro de um PreferenciasProvider')
  }
  return contexto
}
