import { useEffect, useState } from 'react'
import * as indicadorMercadoService from '../services/indicadorMercadoService'
import styles from './RodapeMercado.module.css'

const INTERVALO_ATUALIZACAO_MS = 5 * 60 * 1000

const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const formatadorPontos = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const formatadorPercentual = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function RodapeMercado() {
  const [indicadores, setIndicadores] = useState(null)

  useEffect(() => {
    let cancelado = false

    const carregar = async () => {
      try {
        const dados = await indicadorMercadoService.obterIndicadores()
        if (!cancelado) {
          setIndicadores(dados)
        }
      } catch (erroRequisicao) {
        // indicadores de mercado são um extra visual — falha silenciosa, rodapé some
      }
    }

    carregar()
    const intervalo = setInterval(carregar, INTERVALO_ATUALIZACAO_MS)

    return () => {
      cancelado = true
      clearInterval(intervalo)
    }
  }, [])

  if (!indicadores) {
    return null
  }

  const itens = [
    indicadores.selic != null
      ? { rotulo: 'Selic', valor: `${formatadorPercentual.format(indicadores.selic)}%` }
      : null,
    indicadores.dolar != null
      ? { rotulo: 'USD/BRL', valor: formatadorMoeda.format(indicadores.dolar) }
      : null,
    indicadores.ibovespa != null
      ? { rotulo: 'Ibovespa', valor: formatadorPontos.format(indicadores.ibovespa) + ' pts' }
      : null,
  ].filter(Boolean)

  if (itens.length === 0) {
    return null
  }

  const horaAtualizacao = indicadores.atualizadoEm
    ? new Date(indicadores.atualizadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <footer className={styles.rodape}>
      <div className={styles.itens}>
        {itens.map((item) => (
          <span key={item.rotulo} className={styles.item}>
            <span className={styles.rotulo}>{item.rotulo}</span>
            <span className={styles.valor}>{item.valor}</span>
          </span>
        ))}
      </div>
      {horaAtualizacao ? <span className={styles.atualizacao}>Atualizado: {horaAtualizacao}</span> : null}
    </footer>
  )
}

export default RodapeMercado
