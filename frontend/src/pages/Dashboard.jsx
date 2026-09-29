import { useEffect, useState } from 'react'
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import * as transacaoService from '../services/transacaoService'
import styles from './Dashboard.module.css'

const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const mesAnoAtual = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function formatarMes(mesIso) {
  const [ano, mes] = mesIso.split('-')
  return `${nomesMeses[Number(mes) - 1]}/${ano.slice(2)}`
}

// Paleta categórica validada (ordem fixa, não gerada por hash) — ver skill de dataviz
const CORES_CATEGORIAS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948']

function Dashboard() {
  const [transacoes, setTransacoes] = useState([])
  const [evolucao, setEvolucao] = useState([])
  const [despesasPorCategoria, setDespesasPorCategoria] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    Promise.all([
      transacaoService.listar(),
      transacaoService.evolucaoMensal(),
      transacaoService.despesasPorCategoria(),
    ])
      .then(([dadosTransacoes, dadosEvolucao, dadosDespesas]) => {
        setTransacoes(dadosTransacoes)
        setEvolucao(dadosEvolucao.map((item) => ({ ...item, mesRotulo: formatarMes(item.mes) })))
        setDespesasPorCategoria(dadosDespesas)
      })
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
          {carregando ? (
            <p className={styles.graficoCarregando}>Carregando...</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={evolucao} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="mesRotulo" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(valor) => `R$${valor}`}
                  width={56}
                />
                <Tooltip formatter={(valor) => formatadorMoeda.format(valor)} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Line type="monotone" dataKey="totalReceitas" name="Receitas" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="totalDespesas" name="Despesas" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className={styles.graficoCard}>
          <h2>Despesas por Categoria</h2>
          {carregando ? (
            <p className={styles.graficoCarregando}>Carregando...</p>
          ) : despesasPorCategoria.length === 0 ? (
            <p className={styles.graficoCarregando}>Nenhuma despesa neste mês.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={despesasPorCategoria}
                  dataKey="total"
                  nameKey="categoriaNome"
                  outerRadius={80}
                  label={({ categoriaNome, percent }) => `${categoriaNome} ${(percent * 100).toFixed(0)}%`}
                >
                  {despesasPorCategoria.map((entrada, indice) => (
                    <Cell key={entrada.categoriaNome} fill={CORES_CATEGORIAS[indice % CORES_CATEGORIAS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(valor) => formatadorMoeda.format(valor)} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
