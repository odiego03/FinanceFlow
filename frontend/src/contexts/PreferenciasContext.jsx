import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import * as usuarioService from '../services/usuarioService'
import { aplicarTema, temaSalvoNoNavegador } from '../utils/tema'

// Os mesmos padrões do backend (PreferenciasService), usados até a resposta chegar ou se ela falhar
export const PREFERENCIAS_PADRAO = {
  ocultarValores: false,
  limiteEssencial: 50,
  limiteTotal: 80,
  simuladorPercentualCdi: 100,
  simuladorPrazoMeses: 12,
  tema: 'CLARO',
  // true até a resposta chegar: o tutorial só abre quando o backend disser que o usuário ainda não viu
  tutorialConcluido: true,
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
  const [tutorialReaberto, setTutorialReaberto] = useState(false)

  // Deslogado (ou se a busca falhar) mantém o último tema do navegador, pra tela de login não mudar de cor
  useEffect(() => {
    const padrao = { ...PREFERENCIAS_PADRAO, tema: temaSalvoNoNavegador() }
    if (!token) {
      setPreferencias(padrao)
      return
    }
    usuarioService
      .buscarPreferencias()
      .then(setPreferencias)
      .catch(() => setPreferencias(padrao))
  }, [token])

  // Em "SISTEMA" acompanha a troca de tema do sistema operacional com o app aberto
  useEffect(() => {
    aplicarTema(preferencias.tema)
    if (preferencias.tema !== 'SISTEMA') return undefined
    const consulta = window.matchMedia('(prefers-color-scheme: dark)')
    const reaplicar = () => aplicarTema('SISTEMA')
    consulta.addEventListener('change', reaplicar)
    return () => consulta.removeEventListener('change', reaplicar)
  }, [preferencias.tema])

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

  const abrirTutorial = useCallback(() => setTutorialReaberto(true), [])

  // Fechar (concluindo ou pulando) marca como visto na conta; se a chamada falhar, só reaparece no próximo login
  const fecharTutorial = useCallback(() => {
    setTutorialReaberto(false)
    setPreferencias((atuais) => ({ ...atuais, tutorialConcluido: true }))
    usuarioService.marcarTutorial(true).catch(() => {})
  }, [])

  const valor = useMemo(() => {
    const ocultarValores = preferencias.ocultarValores
    return {
      preferencias,
      salvar,
      tutorialAberto: Boolean(token) && (tutorialReaberto || !preferencias.tutorialConcluido),
      abrirTutorial,
      fecharTutorial,
      ocultarValores,
      alternarOcultarValores,
      formatarMoeda: (numero) => (ocultarValores ? VALOR_OCULTO : formatadorMoeda.format(numero)),
      // Texto que já vem com R$ dentro (ex: mensagens das sugestões)
      ocultarValoresNoTexto: (texto) => (ocultarValores ? texto.replace(/R\$\s?-?[\d.,]+/g, VALOR_OCULTO) : texto),
    }
  }, [preferencias, salvar, alternarOcultarValores, token, tutorialReaberto, abrirTutorial, fecharTutorial])

  return <PreferenciasContext.Provider value={valor}>{children}</PreferenciasContext.Provider>
}

export function usePreferencias() {
  const contexto = useContext(PreferenciasContext)
  if (!contexto) {
    throw new Error('usePreferencias precisa ser usado dentro de um PreferenciasProvider')
  }
  return contexto
}
