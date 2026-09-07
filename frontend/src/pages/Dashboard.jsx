import { useEffect, useState } from 'react'
import * as transacaoService from '../services/transacaoService'
import styles from './Dashboard.module.css'

const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const mesAnoAtual = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

function Dashboard() {
  const [transacoes, setTransacoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    transacaoService
      .listar()
      .then(setTransacoes)
      .catch(() => setErro('Não foi possível carregar os dados financeiros.'))
      .finally(() => setCarregando(false))
  }, [])

  const totalReceitas = transacoes
    .filter((transacao) => transacao.tipo === 'RECEITA')
    .reduce((soma, transacao) => soma + transacao.valor, 0)

  const totalDespesas = transacoes
    .filter((transacao) => transacao.tipo === 'DESPESA')
    .reduce((soma, transacao) => soma + transacao.valor, 0)

  const saldo = totalReceitas - totalDespesas

  return (
    <div className={styles.pagina}>
      <div className={styles.cabecalho}>
        <h1>Dashboard Financeiro</h1>
        <span className={styles.mesAno}>{mesAnoAtual}</span>
      </div>

      {erro ? <p className={styles.erro}>{erro}</p> : null}

      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardTopo}>
            <span>Receitas</span>
            <span className={styles.iconeReceita}>↗</span>
          </div>
          <strong className={styles.valorPositivo}>
            {carregando ? '...' : formatadorMoeda.format(totalReceitas)}
          </strong>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTopo}>
            <span>Despesas</span>
            <span className={styles.iconeDespesa}>↘</span>
          </div>
          <strong className={styles.valorNegativo}>
            {carregando ? '...' : formatadorMoeda.format(totalDespesas)}
          </strong>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTopo}>
            <span>Saldo</span>
            <span>💼</span>
          </div>
          <strong className={saldo >= 0 ? styles.valorPositivo : styles.valorNegativo}>
            {carregando ? '...' : formatadorMoeda.format(saldo)}
          </strong>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTopo}>
            <span>Comprometimento</span>
          </div>
          <strong className={styles.valorIndisponivel}>—</strong>
          <span className={styles.emBreve}>Em breve</span>
        </div>
      </div>

      <div className={styles.graficos}>
        <div className={styles.graficoCard}>
          <h2>Evolução nos Últimos 6 Meses</h2>
          <div className={styles.graficoPlaceholder}>Em breve</div>
        </div>

        <div className={styles.graficoCard}>
          <h2>Despesas por Categoria</h2>
          <div className={styles.graficoPlaceholder}>Em breve</div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
