import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { Carregando, Esqueleto } from '../components/Esqueleto'
import IconeCategoria from '../components/IconeCategoria'
import PainelSugestoes from '../components/PainelSugestoes'
import { useAuth } from '../contexts/AuthContext'
import { usePreferencias } from '../contexts/PreferenciasContext'
import * as categoriaService from '../services/categoriaService'
import * as comprometimentoService from '../services/comprometimentoService'
import * as sugestaoService from '../services/sugestaoService'
import * as transacaoService from '../services/transacaoService'
import { resumirDescricao } from '../utils/descricao'
import { estiloTooltip } from '../utils/graficos'
import styles from './Dashboard.module.css'

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

// Cor só pra categoria sem cor própria; a cor segue a categoria, nunca a posição no ranking
const CORES_CATEGORIAS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948']
const COR_OUTRAS = '#9ca3af'
const MAXIMO_FATIAS = 8
const QUANTIDADE_ULTIMAS = 5

const formatadorPercentual = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const formatadorPercentualInteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const formatadorCompacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
const formatadorData = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' })

// Status sempre com ícone + texto, nunca só cor
const NIVEIS_COMPROMETIMENTO = {
  NORMAL: { texto: 'Saudável', icone: 'check-circle-fill', classe: 'nivelNormal' },
  ATENCAO: { texto: 'Atenção', icone: 'exclamation-triangle-fill', classe: 'nivelAtencao' },
  RISCO: { texto: 'Risco', icone: 'x-octagon-fill', classe: 'nivelRisco' },
  SEM_RENDA: { texto: 'Sem renda no mês', icone: 'dash-circle', classe: 'nivelNeutro' },
}

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

function mesAnterior(mesIso) {
  const [ano, mes] = mesIso.split('-').map(Number)
  const data = new Date(ano, mes - 2, 1)
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
}

function saudacao() {
  const hora = new Date().getHours()
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

function somar(transacoes, tipo) {
  return transacoes.filter((t) => t.tipo === tipo).reduce((soma, t) => soma + t.valor, 0)
}

// Variação contra o mês anterior. maiorEhMelhor decide a cor: receita subir é bom, despesa subir é ruim
function Variacao({ atual, anterior, maiorEhMelhor, rotuloAnterior }) {
  if (anterior === null) return null
  if (anterior === 0) {
    return <span className={styles.variacaoNeutra}>Sem lançamentos em {rotuloAnterior}</span>
  }
  const percentual = ((atual - anterior) / Math.abs(anterior)) * 100
  if (Math.abs(percentual) < 0.5) {
    return (
      <span className={styles.variacaoNeutra}>
        <i className="bi bi-dash" aria-hidden="true" /> Igual a {rotuloAnterior}
      </span>
    )
  }
  const subiu = percentual > 0
  const bom = subiu === maiorEhMelhor
  return (
    <span className={bom ? styles.variacaoBoa : styles.variacaoRuim}>
      <i className={`bi bi-arrow-${subiu ? 'up' : 'down'}-short`} aria-hidden="true" />
      {formatadorPercentualInteiro.format(Math.abs(percentual))}% {subiu ? 'a mais' : 'a menos'} que {rotuloAnterior}
    </span>
  )
}

function CardValor({ rotulo, icone, valor, classeValor, carregando, children }) {
  return (
    <div className={styles.card}>
      <span className={styles.rotuloCard}>
        <i className={`bi bi-${icone}`} aria-hidden="true" /> {rotulo}
      </span>
      {carregando ? (
        <Esqueleto largura="70%" altura={32} raio={8} />
      ) : (
        <strong className={`${styles.valorCard} ${classeValor}`}>{valor}</strong>
      )}
      {carregando ? <Esqueleto largura="55%" altura={12} /> : children}
    </div>
  )
}

// Barra de 0 a 100% da renda com a marca do limite de risco: mostra o quanto falta antes de mostrar o número
function CardComprometimento({ mesFiltro, carregando, indicador, rotuloPeriodo }) {
  if (!mesFiltro) {
    return (
      <div className={`${styles.card} ${styles.cardComprometimento}`}>
        <span className={styles.rotuloCard}>
          <i className="bi bi-speedometer2" aria-hidden="true" /> Comprometimento da renda
        </span>
        <p className={styles.textoAjuda}>Escolha um mês para ver quanto da renda já foi gasto.</p>
      </div>
    )
  }
  if (carregando || !indicador) {
    return (
      <div className={`${styles.card} ${styles.cardComprometimento}`}>
        <span className={styles.rotuloCard}>
          <i className="bi bi-speedometer2" aria-hidden="true" /> Comprometimento da renda
        </span>
        <Esqueleto largura="40%" altura={32} raio={8} />
        <Esqueleto altura={10} raio={999} />
        <Esqueleto largura="70%" altura={12} />
      </div>
    )
  }

  const nivel = NIVEIS_COMPROMETIMENTO[indicador.nivel]
  const temRenda = indicador.percentualTotal !== null
  const risco = indicador.nivel === 'RISCO'
  const atencao = indicador.nivel === 'ATENCAO'

  return (
    <div className={`${styles.card} ${styles.cardComprometimento}`}>
      <div className={styles.topoComprometimento}>
        <span className={styles.rotuloCard}>
          <i className="bi bi-speedometer2" aria-hidden="true" /> Comprometimento da renda
        </span>
        <span className={`${styles.nivel} ${styles[nivel.classe]}`}>
          <i className={`bi bi-${nivel.icone}`} aria-hidden="true" /> {nivel.texto}
        </span>
      </div>

      {temRenda ? (
        <>
          <strong className={styles.valorCard}>
            {formatadorPercentual.format(indicador.percentualTotal)}%
            <small> da renda já foi gasto</small>
          </strong>
          <div
            className={styles.medidor}
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(indicador.percentualTotal)}
            aria-label="Comprometimento da renda"
          >
            <div
              className={`${styles.medidorPreenchido} ${styles[nivel.classe]}`}
              style={{ width: `${Math.min(100, indicador.percentualTotal)}%` }}
            />
            <span
              className={styles.medidorLimite}
              style={{ left: `${indicador.limiteTotal}%` }}
              title={`Limite de risco: ${formatadorPercentual.format(indicador.limiteTotal)}%`}
            />
          </div>
          <span className={styles.textoAjuda}>
            Essenciais: {formatadorPercentual.format(indicador.percentualEssencial)}% (limite{' '}
            {formatadorPercentual.format(indicador.limiteEssencial)}%) · Risco a partir de{' '}
            {formatadorPercentual.format(indicador.limiteTotal)}%
          </span>
          {risco || atencao ? (
            <p className={styles.alertaInterno}>
              {risco
                ? `Acima de ${formatadorPercentual.format(indicador.limiteTotal)}% sobra pouca margem para imprevistos e para poupar em ${rotuloPeriodo}.`
                : `As despesas essenciais passaram de ${formatadorPercentual.format(indicador.limiteEssencial)}% da renda em ${rotuloPeriodo}.`}{' '}
              Veja as sugestões abaixo.
            </p>
          ) : null}
        </>
      ) : (
        <p className={styles.textoAjuda}>
          Nenhuma receita em {rotuloPeriodo}. Lance o que entrou para o indicador funcionar.
        </p>
      )}
    </div>
  )
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
  return <span style={{ color: 'var(--texto-2)' }}>{valor}</span>
}

function rotuloFatia({ categoriaNome, percent }) {
  return percent >= 0.05 ? `${categoriaNome} ${(percent * 100).toFixed(0)}%` : null
}

// Formato aproximado de cada gráfico enquanto os dados chegam
const ALTURAS_BARRAS = [45, 62, 38, 70, 55, 82, 48, 66, 74, 58, 88, 64]

function GraficoLinhaEsqueleto() {
  return (
    <Carregando rotulo="Carregando a evolução" className={styles.esqueletoGrafico}>
      {ALTURAS_BARRAS.map((altura, indice) => (
        <Esqueleto key={indice} altura={`${altura}%`} raio={6} />
      ))}
    </Carregando>
  )
}

function GraficoPizzaEsqueleto() {
  return (
    <Carregando rotulo="Carregando as categorias" className={styles.esqueletoPizza}>
      <Esqueleto circulo altura={170} />
      <div className={styles.esqueletoLegenda}>
        {[70, 55, 80, 45].map((largura) => (
          <div key={largura} className={styles.esqueletoLegendaItem}>
            <Esqueleto circulo altura={12} />
            <Esqueleto largura={`${largura}%`} altura={12} />
          </div>
        ))}
      </div>
    </Carregando>
  )
}

function Dashboard() {
  const { usuario } = useAuth()
  const { formatarMoeda, ocultarValores } = usePreferencias()
  const [transacoes, setTransacoes] = useState([])
  const [categorias, setCategorias] = useState([])
  const [carregandoTransacoes, setCarregandoTransacoes] = useState(true)
  const [periodoEscolhido, setPeriodoEscolhido] = useState(null)

  // Cada resposta guarda o filtro que a gerou; "carregando" = o filtro atual ainda não tem resposta
  const [mesesEvolucao, setMesesEvolucao] = useState(6)
  const [respostaEvolucao, setRespostaEvolucao] = useState({ filtro: null, dados: [] })

  const [tipoCategoria, setTipoCategoria] = useState('DESPESA')
  const [respostaCategoria, setRespostaCategoria] = useState({ filtro: null, dados: [] })

  const [respostaComprometimento, setRespostaComprometimento] = useState({ filtro: null, dados: null })
  const [respostaSugestoes, setRespostaSugestoes] = useState({ filtro: null, dados: [], erro: false })

  const [erro, setErro] = useState('')

  useEffect(() => {
    Promise.all([transacaoService.listar(), categoriaService.listar()])
      .then(([dadosTransacoes, dadosCategorias]) => {
        setTransacoes(dadosTransacoes)
        setCategorias(dadosCategorias)
      })
      .catch(() => setErro('Não foi possível carregar os dados financeiros.'))
      .finally(() => setCarregandoTransacoes(false))
  }, [])

  const categoriasPorId = useMemo(
    () => Object.fromEntries(categorias.map((categoria) => [categoria.id, categoria])),
    [categorias],
  )

  // Meses com lançamento (mais recente primeiro), sempre incluindo o mês atual
  const mesesDisponiveis = useMemo(() => {
    const meses = new Set(transacoes.map((transacao) => transacao.data.slice(0, 7)))
    meses.add(mesAtualIso())
    return [...meses].sort().reverse()
  }, [transacoes])

  // Sem escolha do usuário, abre no mês mais recente que tem lançamento, pra não começar com tudo vazio
  // Ignora datas futuras: parcelas já agendadas fariam o Dashboard abrir no mês da última parcela
  const hojeIso = new Date().toLocaleDateString('sv-SE')
  const transacoesAteHoje = transacoes.filter((transacao) => transacao.data <= hojeIso)
  const mesMaisRecenteComDados = transacoesAteHoje.length > 0
    ? transacoesAteHoje.reduce((maisRecente, transacao) => (transacao.data > maisRecente ? transacao.data : maisRecente), '').slice(0, 7)
    : mesAtualIso()
  const periodo = periodoEscolhido ?? mesMaisRecenteComDados
  const mesFiltro = periodo === TODO_PERIODO ? null : periodo

  const filtroCategoria = `${tipoCategoria}|${mesFiltro ?? TODO_PERIODO}`
  const carregandoCategoria = carregandoTransacoes || respostaCategoria.filtro !== filtroCategoria
  const carregandoEvolucao = respostaEvolucao.filtro !== mesesEvolucao
  const carregandoComprometimento = carregandoTransacoes || respostaComprometimento.filtro !== mesFiltro

  // As sugestões são mensais; em "Todo o período" usam o mês atual
  const mesSugestoes = mesFiltro ?? mesAtualIso()
  const carregandoSugestoes = carregandoTransacoes || respostaSugestoes.filtro !== mesSugestoes

  useEffect(() => {
    if (carregandoTransacoes) return
    sugestaoService
      .listar(mesSugestoes)
      .then((dados) => setRespostaSugestoes({ filtro: mesSugestoes, dados, erro: false }))
      .catch(() => setRespostaSugestoes({ filtro: mesSugestoes, dados: [], erro: true }))
  }, [mesSugestoes, carregandoTransacoes])

  // Indicador é mensal: em "Todo o período" não busca nada (o card pede pra escolher um mês)
  useEffect(() => {
    if (carregandoTransacoes || !mesFiltro) return
    comprometimentoService
      .buscar(mesFiltro)
      .then((dados) => setRespostaComprometimento({ filtro: mesFiltro, dados }))
      .catch(() => {
        setErro('Não foi possível carregar os dados financeiros.')
        setRespostaComprometimento({ filtro: mesFiltro, dados: null })
      })
  }, [mesFiltro, carregandoTransacoes])

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
  const totalReceitas = somar(transacoesDoPeriodo, 'RECEITA')
  const totalDespesas = somar(transacoesDoPeriodo, 'DESPESA')
  const saldo = totalReceitas - totalDespesas

  // Comparação com o mês anterior (só faz sentido com um mês escolhido)
  const mesComparado = mesFiltro ? mesAnterior(mesFiltro) : null
  const transacoesAnteriores = mesComparado ? transacoes.filter((t) => t.data.startsWith(mesComparado)) : []
  const receitasAnteriores = mesComparado ? somar(transacoesAnteriores, 'RECEITA') : null
  const despesasAnteriores = mesComparado ? somar(transacoesAnteriores, 'DESPESA') : null
  const saldoAnterior = mesComparado ? receitasAnteriores - despesasAnteriores : null
  const rotuloAnterior = mesComparado ? nomesMesesCompletos[Number(mesComparado.slice(5)) - 1].toLowerCase() : ''

  const ultimas = useMemo(
    () => [...transacoes]
      .filter((transacao) => transacao.data <= hojeIso)
      .sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id)
      .slice(0, QUANTIDADE_ULTIMAS),
    [transacoes, hojeIso],
  )

  const fatias = agruparFatias(respostaCategoria.dados)
  const rotuloTipo = tipoCategoria === 'DESPESA' ? 'despesa' : 'receita'
  const rotuloPeriodo = mesFiltro ? formatarMesCompleto(mesFiltro).toLowerCase() : 'todo o período'
  const indiceMes = mesesDisponiveis.indexOf(periodo)
  const primeiroNome = usuario?.nome?.split(' ')[0]

  // Setas do seletor: a lista está do mais recente pro mais antigo
  const irParaMes = (deslocamento) => {
    const destino = mesesDisponiveis[indiceMes + deslocamento]
    if (destino) setPeriodoEscolhido(destino)
  }

  return (
    <div className={styles.pagina}>
      <div className={styles.cabecalho}>
        <div>
          <h1>
            {saudacao()}
            {primeiroNome ? `, ${primeiroNome}` : ''}
          </h1>
          <p>Este é o resumo das suas finanças em {rotuloPeriodo}.</p>
        </div>
        <div className={styles.acoesCabecalho}>
          <div className={styles.seletorMes}>
            <button
              type="button"
              onClick={() => irParaMes(1)}
              disabled={carregandoTransacoes || indiceMes === -1 || indiceMes >= mesesDisponiveis.length - 1}
              aria-label="Mês anterior"
            >
              <i className="bi bi-chevron-left" aria-hidden="true" />
            </button>
            <select
              value={periodo}
              onChange={(event) => setPeriodoEscolhido(event.target.value)}
              disabled={carregandoTransacoes}
              aria-label="Período"
            >
              {mesesDisponiveis.map((mes) => (
                <option key={mes} value={mes}>
                  {formatarMesCompleto(mes)}
                </option>
              ))}
              <option value={TODO_PERIODO}>Todo o período</option>
            </select>
            <button
              type="button"
              onClick={() => irParaMes(-1)}
              disabled={carregandoTransacoes || indiceMes <= 0}
              aria-label="Próximo mês"
            >
              <i className="bi bi-chevron-right" aria-hidden="true" />
            </button>
          </div>
          <Link to="/transacoes?nova=1" className={styles.botaoPrimario}>
            <i className="bi bi-plus-lg" aria-hidden="true" /> Lançar transação
          </Link>
        </div>
      </div>

      {erro ? <p className={styles.erro}>{erro}</p> : null}

      <div className={styles.cards}>
        <CardValor
          rotulo="Saldo"
          icone="wallet2"
          valor={formatarMoeda(saldo)}
          classeValor={saldo >= 0 ? styles.valorPositivo : styles.valorNegativo}
          carregando={carregandoTransacoes}
        >
          <Variacao atual={saldo} anterior={saldoAnterior} maiorEhMelhor rotuloAnterior={rotuloAnterior} />
          {!mesFiltro ? <span className={styles.variacaoNeutra}>Receitas menos despesas</span> : null}
        </CardValor>
        <CardValor
          rotulo="Receitas"
          icone="arrow-down-circle"
          valor={formatarMoeda(totalReceitas)}
          classeValor={styles.valorPositivo}
          carregando={carregandoTransacoes}
        >
          <Variacao atual={totalReceitas} anterior={receitasAnteriores} maiorEhMelhor rotuloAnterior={rotuloAnterior} />
          {!mesFiltro ? <span className={styles.variacaoNeutra}>O que entrou</span> : null}
        </CardValor>
        <CardValor
          rotulo="Despesas"
          icone="arrow-up-circle"
          valor={formatarMoeda(totalDespesas)}
          classeValor={styles.valorNegativo}
          carregando={carregandoTransacoes}
        >
          <Variacao
            atual={totalDespesas}
            anterior={despesasAnteriores}
            maiorEhMelhor={false}
            rotuloAnterior={rotuloAnterior}
          />
          {!mesFiltro ? <span className={styles.variacaoNeutra}>O que saiu</span> : null}
        </CardValor>
        <CardComprometimento
          mesFiltro={mesFiltro}
          carregando={carregandoComprometimento}
          indicador={respostaComprometimento.dados}
          rotuloPeriodo={rotuloPeriodo}
        />
      </div>

      <PainelSugestoes
        sugestoes={respostaSugestoes.dados}
        carregando={carregandoSugestoes}
        erro={respostaSugestoes.erro}
        rotuloMes={formatarMesCompleto(mesSugestoes).toLowerCase()}
      />

      <div className={styles.graficos}>
        <section className={styles.graficoCard}>
          <div className={styles.graficoTopo}>
            <div>
              <h2>Entradas e saídas por mês</h2>
              <p className={styles.subtituloGrafico}>Últimos {mesesEvolucao} meses</p>
            </div>
            <div className={styles.segmentado} role="group" aria-label="Intervalo do gráfico">
              {OPCOES_EVOLUCAO.map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  aria-pressed={mesesEvolucao === opcao}
                  className={mesesEvolucao === opcao ? styles.segmentoAtivo : ''}
                  onClick={() => setMesesEvolucao(opcao)}
                >
                  {opcao} meses
                </button>
              ))}
            </div>
          </div>
          {carregandoEvolucao ? (
            <GraficoLinhaEsqueleto />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={respostaEvolucao.dados} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--borda)" vertical={false} />
                <XAxis dataKey="mesRotulo" tick={{ fontSize: 12, fill: 'var(--texto-suave)' }} axisLine={{ stroke: 'var(--borda)' }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12, fill: 'var(--texto-suave)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(valor) => (ocultarValores ? '•••' : `R$ ${formatadorCompacto.format(valor)}`)}
                  width={70}
                />
                <Tooltip contentStyle={estiloTooltip} formatter={(valor) => formatarMoeda(valor)} />
                <Legend wrapperStyle={{ fontSize: 13 }} formatter={textoLegenda} />
                <Line type="monotone" dataKey="totalReceitas" name="Receitas" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="totalDespesas" name="Despesas" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className={styles.graficoCard}>
          <div className={styles.graficoTopo}>
            <div>
              <h2>{tipoCategoria === 'DESPESA' ? 'Para onde foi o dinheiro' : 'De onde veio o dinheiro'}</h2>
              <p className={styles.subtituloGrafico}>
                {tipoCategoria === 'DESPESA' ? 'Despesas' : 'Receitas'} por categoria · {rotuloPeriodo}
              </p>
            </div>
            <div className={styles.segmentado} role="group" aria-label="Tipo">
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
          {carregandoCategoria ? (
            <GraficoPizzaEsqueleto />
          ) : fatias.length === 0 ? (
            <div className={styles.vazioGrafico}>
              <i className="bi bi-pie-chart" aria-hidden="true" />
              <span>Nenhuma {rotuloTipo} em {rotuloPeriodo}.</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={fatias}
                  dataKey="total"
                  nameKey="categoriaNome"
                  outerRadius={80}
                  stroke="var(--superficie)"
                  strokeWidth={2}
                  label={rotuloFatia}
                  labelLine={false}
                >
                  {fatias.map((fatia) => (
                    <Cell key={fatia.categoriaId} fill={fatia.cor} />
                  ))}
                </Pie>
                <Tooltip contentStyle={estiloTooltip} formatter={(valor) => formatarMoeda(valor)} />
                <Legend wrapperStyle={{ fontSize: 13 }} formatter={textoLegenda} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>

      <section className={styles.graficoCard}>
        <div className={styles.graficoTopo}>
          <div>
            <h2>Últimas transações</h2>
            <p className={styles.subtituloGrafico}>O que entrou e saiu mais recentemente</p>
          </div>
          <Link to="/transacoes" className={styles.linkVerTodas}>
            Ver todas <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
        </div>
        {carregandoTransacoes ? (
          <Carregando rotulo="Carregando as últimas transações" className={styles.ultimas}>
            {[60, 45, 70].map((largura) => (
              <div key={largura} className={styles.itemUltima}>
                <Esqueleto circulo altura={34} />
                <div className={styles.textoUltima}>
                  <Esqueleto largura={`${largura}%`} altura={13} />
                  <Esqueleto largura="30%" altura={11} />
                </div>
                <Esqueleto largura={80} altura={14} />
              </div>
            ))}
          </Carregando>
        ) : ultimas.length === 0 ? (
          <div className={styles.vazioGrafico}>
            <i className="bi bi-receipt" aria-hidden="true" />
            <span>Nenhuma transação ainda.</span>
            <Link to="/transacoes" className={styles.linkVerTodas}>
              Lançar a primeira <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <ul className={styles.ultimas}>
            {ultimas.map((transacao) => {
              const categoria = categoriasPorId[transacao.categoriaId]
              const resumo = resumirDescricao(transacao.descricao)
              const receita = transacao.tipo === 'RECEITA'
              return (
                <li key={transacao.id} className={styles.itemUltima}>
                  <IconeCategoria icone={categoria?.icone ?? 'tag'} cor={categoria?.cor ?? '#94a3b8'} size={34} />
                  <div className={styles.textoUltima} title={transacao.descricao || undefined}>
                    <strong>{resumo.titulo || transacao.categoriaNome}</strong>
                    <span>
                      {transacao.categoriaNome} · {formatadorData.format(new Date(`${transacao.data}T00:00:00`))}
                    </span>
                  </div>
                  <strong className={receita ? styles.valorPositivo : styles.valorNegativo}>
                    {receita ? '+ ' : '− '}
                    {formatarMoeda(transacao.valor)}
                  </strong>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

export default Dashboard
