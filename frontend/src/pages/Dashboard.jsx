import { useEffect, useMemo, useState } from 'react'
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

const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const nomesMesesCompletos = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const TODO_PERIODO = 'TODOS'
const OPCOES_EVOLUCAO = [3, 6, 12]
const OPCOES_TIPO = [
  { valor: 'DESPESA', texto: 'Despesas' },
  { valor: 'RECEITA', texto: 'Receitas' },
]

// Paleta categórica validada — só pra categoria sem cor própria; a cor segue a categoria, nunca a posição no ranking
const CORES_CATEGORIAS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948']
const COR_OUTRAS = '#9ca3af'
const MAXIMO_FATIAS = 8

function formatarMes(mesIso) {
  const [ano, mes] = mesIso.split('-')
  return `${nomesMeses[Number(mes) - 1]}/${ano.slice(2)}`
}

function formatarMesCompleto(mesIso) {
  const [ano, mes] = mesIso.split('-')
  return `${nomesMesesCompletos[Number(mes) - 1]} de ${ano}`
}

function mesAtualIso() {
  const hoje = new Date()
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
}

function corDaCategoria(categoria) {
  return categoria.cor || CORES_CATEGORIAS[categoria.categoriaId % CORES_CATEGORIAS.length]
}

// Acima de MAXIMO_FATIAS a pizza fica ilegível: as menores viram uma fatia "Outras"
function agruparFatias(totais) {
  if (totais.length <= MAXIMO_FATIAS) {
    return totais.map((total) => ({ ...total, cor: corDaCategoria(total) }))
  }
  const principais = totais.slice(0, MAXIMO_FATIAS - 1).map((total) => ({ ...total, cor: corDaCategoria(total) }))
  const somaOutras = totais.slice(MAXIMO_FATIAS - 1).reduce((soma, total) => soma + total.total, 0)
  return [...principais, { categoriaId: 'outras', categoriaNome: 'Outras', total: somaOutras, cor: COR_OUTRAS }]
}

// Texto da legenda em tinta neutra; quem carrega a identidade é o marcador colorido ao lado
function textoLegenda(valor) {
  return <span style={{ color: '#374151' }}>{valor}</span>
}

function rotuloFatia({ categoriaNome, percent }) {
  return percent >= 0.05 ? `${categoriaNome} ${(percent * 100).toFixed(0)}%` : null
}

function Dashboard() {
  const [transacoes, setTransacoes] = useState([])
  const [carregandoTransacoes, setCarregandoTransacoes] = useState(true)
  const [periodoEscolhido, setPeriodoEscolhido] = useState(null)

  // Cada resposta guarda o filtro que a gerou; "carregando" = o filtro atual ainda não tem resposta
  const [mesesEvolucao, setMesesEvolucao] = useState(6)
  const [respostaEvolucao, setRespostaEvolucao] = useState({ filtro: null, dados: [] })

  const [tipoCategoria, setTipoCategoria] = useState('DESPESA')
  const [respostaCategoria, setRespostaCategoria] = useState({ filtro: null, dados: [] })

  const [erro, setErro] = useState('')

  useEffect(() => {
    transacaoService
      .listar()
      .then(setTransacoes)
      .catch(() => setErro('Não foi possível carregar os dados financeiros.'))
      .finally(() => setCarregandoTransacoes(false))
  }, [])

  // Meses com lançamento (mais recente primeiro), sempre incluindo o mês atual
  const mesesDisponiveis = useMemo(() => {
    const meses = new Set(transacoes.map((transacao) => transacao.data.slice(0, 7)))
    meses.add(mesAtualIso())
    return [...meses].sort().reverse()
  }, [transacoes])

  // Sem escolha do usuário, abre no mês mais recente que tem lançamento, pra não começar com tudo vazio
  const mesMaisRecenteComDados = transacoes.length > 0
    ? transacoes.reduce((maisRecente, transacao) => (transacao.data > maisRecente ? transacao.data : maisRecente), '').slice(0, 7)
    : mesAtualIso()
  const periodo = periodoEscolhido ?? mesMaisRecenteComDados
  const mesFiltro = periodo === TODO_PERIODO ? null : periodo

  const filtroCategoria = `${tipoCategoria}|${mesFiltro ?? TODO_PERIODO}`
  const carregandoCategoria = carregandoTransacoes || respostaCategoria.filtro !== filtroCategoria
  const carregandoEvolucao = respostaEvolucao.filtro !== mesesEvolucao

  useEffect(() => {
    if (carregandoTransacoes) return
    transacaoService
      .totaisPorCategoria(tipoCategoria, mesFiltro)
      .then((dados) => setRespostaCategoria({ filtro: filtroCategoria, dados }))
      .catch(() => {
        setErro('Não foi possível carregar os dados financeiros.')
        setRespostaCategoria({ filtro: filtroCategoria, dados: [] })
      })
  }, [tipoCategoria, mesFiltro, filtroCategoria, carregandoTransacoes])

  useEffect(() => {
    transacaoService
      .evolucaoMensal(mesesEvolucao)
      .then((dados) => setRespostaEvolucao({
        filtro: mesesEvolucao,
        dados: dados.map((item) => ({ ...item, mesRotulo: formatarMes(item.mes) })),
      }))
      .catch(() => {
        setErro('Não foi possível carregar os dados financeiros.')
        setRespostaEvolucao({ filtro: mesesEvolucao, dados: [] })
      })
  }, [mesesEvolucao])

  const transacoesDoPeriodo = mesFiltro
    ? transacoes.filter((transacao) => transacao.data.startsWith(mesFiltro))
    : transacoes

  const totalReceitas = transacoesDoPeriodo
    .filter((transacao) => transacao.tipo === 'RECEITA')
    .reduce((soma, transacao) => soma + transacao.valor, 0)

  const totalDespesas = transacoesDoPeriodo
    .filter((transacao) => transacao.tipo === 'DESPESA')
    .reduce((soma, transacao) => soma + transacao.valor, 0)

  const saldo = totalReceitas - totalDespesas
  const fatias = agruparFatias(respostaCategoria.dados)
  const rotuloTipo = tipoCategoria === 'DESPESA' ? 'Despesas' : 'Receitas'
  const rotuloPeriodo = mesFiltro ? formatarMesCompleto(mesFiltro) : 'todo o período'

  return (
    <div className={styles.pagina}>
      <div className={styles.cabecalho}>
        <h1>Dashboard Financeiro</h1>
        <label className={styles.filtroPeriodo}>
          <span>Período</span>
          <select
            value={periodo}
            onChange={(event) => setPeriodoEscolhido(event.target.value)}
            disabled={carregandoTransacoes}
          >
            {mesesDisponiveis.map((mes) => (
              <option key={mes} value={mes}>
                {formatarMesCompleto(mes)}
              </option>
            ))}
            <option value={TODO_PERIODO}>Todo o período</option>
          </select>
        </label>
      </div>

      {erro ? <p className={styles.erro}>{erro}</p> : null}

      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardTopo}>
            <span>Receitas</span>
            <span className={styles.iconeReceita}>↗</span>
          </div>
          <strong className={styles.valorPositivo}>
            {carregandoTransacoes ? '...' : formatadorMoeda.format(totalReceitas)}
          </strong>
          <span className={styles.legendaCard}>{rotuloPeriodo}</span>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTopo}>
            <span>Despesas</span>
            <span className={styles.iconeDespesa}>↘</span>
          </div>
          <strong className={styles.valorNegativo}>
            {carregandoTransacoes ? '...' : formatadorMoeda.format(totalDespesas)}
          </strong>
          <span className={styles.legendaCard}>{rotuloPeriodo}</span>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTopo}>
            <span>Saldo</span>
            <span>💼</span>
          </div>
          <strong className={saldo >= 0 ? styles.valorPositivo : styles.valorNegativo}>
            {carregandoTransacoes ? '...' : formatadorMoeda.format(saldo)}
          </strong>
          <span className={styles.legendaCard}>{rotuloPeriodo}</span>
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
          <div className={styles.graficoTopo}>
            <h2>Evolução nos Últimos {mesesEvolucao} Meses</h2>
            <div className={styles.segmentado} role="group" aria-label="Intervalo do gráfico de evolução">
              {OPCOES_EVOLUCAO.map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  aria-pressed={mesesEvolucao === opcao}
                  className={mesesEvolucao === opcao ? styles.segmentoAtivo : ''}
                  onClick={() => setMesesEvolucao(opcao)}
                >
                  {opcao}m
                </button>
              ))}
            </div>
          </div>
          {carregandoEvolucao ? (
            <p className={styles.graficoCarregando}>Carregando...</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={respostaEvolucao.dados} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
                <Legend wrapperStyle={{ fontSize: 13 }} formatter={textoLegenda} />
                <Line type="monotone" dataKey="totalReceitas" name="Receitas" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="totalDespesas" name="Despesas" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className={styles.graficoCard}>
          <div className={styles.graficoTopo}>
            <h2>{rotuloTipo} por Categoria</h2>
            <div className={styles.segmentado} role="group" aria-label="Tipo do gráfico por categoria">
              {OPCOES_TIPO.map((opcao) => (
                <button
                  key={opcao.valor}
                  type="button"
                  aria-pressed={tipoCategoria === opcao.valor}
                  className={tipoCategoria === opcao.valor ? styles.segmentoAtivo : ''}
                  onClick={() => setTipoCategoria(opcao.valor)}
                >
                  {opcao.texto}
                </button>
              ))}
            </div>
          </div>
          <p className={styles.subtituloGrafico}>{rotuloPeriodo}</p>
          {carregandoCategoria ? (
            <p className={styles.graficoCarregando}>Carregando...</p>
          ) : fatias.length === 0 ? (
            <p className={styles.graficoCarregando}>
              Nenhuma {tipoCategoria === 'DESPESA' ? 'despesa' : 'receita'} em {rotuloPeriodo}.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={fatias}
                  dataKey="total"
                  nameKey="categoriaNome"
                  outerRadius={80}
                  stroke="#ffffff"
                  strokeWidth={2}
                  label={rotuloFatia}
                  labelLine={false}
                >
                  {fatias.map((fatia) => (
                    <Cell key={fatia.categoriaId} fill={fatia.cor} />
                  ))}
                </Pie>
                <Tooltip formatter={(valor) => formatadorMoeda.format(valor)} />
                <Legend wrapperStyle={{ fontSize: 13 }} formatter={textoLegenda} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
