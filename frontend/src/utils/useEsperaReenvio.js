import { useEffect, useState } from 'react'

// Mesmo intervalo mínimo que o backend impõe entre dois e-mails do mesmo tipo (código de senha, confirmação de conta)
export const ESPERA_REENVIO_SEGUNDOS = 60

/**
 * Contagem regressiva do botão de reenviar e-mail: depois de cada envio o botão fica desabilitado por 1 minuto.
 * Com `comecarContando` (o e-mail acabou de ser enviado) já nasce contando. Devolve os segundos que faltam
 * (0 = liberado) e `iniciar()`, pra chamar quando um envio der certo.
 */
export function useEsperaReenvio(comecarContando = false) {
  const [liberadoEm, setLiberadoEm] = useState(() =>
    comecarContando ? Date.now() + ESPERA_REENVIO_SEGUNDOS * 1000 : 0,
  )
  // Calcula pelo relógio, e não contando ticks, pra aba em segundo plano (timers atrasados pelo navegador) não
  // esticar a espera; o relógio só anda enquanto a contagem estiver rodando
  const [agora, setAgora] = useState(() => Date.now())
  const segundos = Math.min(ESPERA_REENVIO_SEGUNDOS, Math.max(0, Math.ceil((liberadoEm - agora) / 1000)))
  const contando = segundos > 0

  useEffect(() => {
    if (!contando) {
      return undefined
    }
    const intervalo = setInterval(() => setAgora(Date.now()), 250)
    return () => clearInterval(intervalo)
  }, [contando])

  const iniciar = () => {
    const instante = Date.now()
    setAgora(instante)
    setLiberadoEm(instante + ESPERA_REENVIO_SEGUNDOS * 1000)
  }

  return { segundos, iniciar }
}

// 75 -> "1:15", 9 -> "0:09"
export function formatarContagem(segundos) {
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`
}
