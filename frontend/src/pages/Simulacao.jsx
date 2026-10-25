import { useEffect, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { usePreferencias } from '../contexts/PreferenciasContext'
import { mensagemDeErro } from '../services/api'
import * as simulacaoService from '../services/simulacaoService'
import styles from './Simulacao.module.css'

const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const formatadorPercentual = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const formatadorCompacto = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const prazosRapidos = [6, 12, 24, 60]

// A cor segue o cenário, nunca a posição no ranking
const coresCenario = {
  POUPANCA: '#eb6834',
  CDB: '#2a78d6',
  TESOURO_SELIC: '#1baf7a',
}

const chaveEvolucao = {
  POUPANCA: 'poupanca',
  CDB: 'cdb',
  TESOURO_SELIC: 'tesouroSelic',
}

function rotuloPrazo(meses) {
  if (meses % 12 === 0) {
    const anos = meses / 12
    return anos === 1 ? '1 ano' : `${anos} anos`
  }
  return `${meses} meses`
}

function textoAliquotaIr(meses) {
  if (meses <= 6) return '22,5%'
  if (meses <= 12) return '20%'
  if (meses <= 24) return '17,5%'
  return '15%'
}

function Simulacao() {
  const { preferencias } = usePreferencias()
  const [valorInicial, setValorInicial] = useState('1000')
  const [aporteMensal, setAporteMensal] = useState('')
  const [prazoMeses, setPrazoMeses] = useState(String(preferencias.simuladorPrazoMeses))
  const [percentualCdi, setPercentualCdi] = useState(String(preferencias.simuladorPercentualCdi))
  const [taxas, setTaxas] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState('')
  const [simulando, setSimulando] = useState(false)

  // As preferências podem chegar depois da página abrir (reload direto em /simulacao); só aplica antes da 1ª simulação
  useEffect(() => {
    if (resultado) return
    setPrazoMeses(String(preferencias.simuladorPrazoMeses))
    setPercentualCdi(String(preferencias.simuladorPercentualCdi))
  }, [preferencias.simuladorPrazoMeses, preferencias.simuladorPercentualCdi])

  useEffect(() => {
    simulacaoService
      .taxas()
      .then(setTaxas)
      .catch(() => setTaxas(null))
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const inicial = valorInicial === '' ? 0 : Number(valorInicial)
    const aporte = aporteMensal === '' ? 0 : Number(aporteMensal)
    const prazo = Number(prazoMeses)

    if (inicial < 0 || aporte < 0) {
      setErro('Os valores não podem ser negativos.')
      return
    }
    if (inicial === 0 && aporte === 0) {
      setErro('Informe um valor inicial ou um aporte mensal.')
      return
    }
    if (!Number.isInteger(prazo) || prazo < 1 || prazo > 360) {
      setErro('O prazo deve ser entre 1 e 360 meses.')
      return
    }

    setErro('')
    setSimulando(true)
    try {
      const resposta = await simulacaoService.simular({
        valorInicial: inicial,
        aporteMensal: aporte,
        prazoMeses: prazo,
        percentualCdi: percentualCdi === '' ? null : Number(percentualCdi),
      })
      setResultado(resposta)
      setTaxas(resposta.taxas)
    } catch (erroRequisicao) {
      setErro(mensagemDeErro(erroRequisicao, 'Não foi possível simular agora.'))
    } finally {
      setSimulando(false)
    }
  }

  const cenariosDisponiveis = resultado?.cenarios.filter((cenario) => cenario.disponivel) ?? []
  const prazoSimulado = resultado?.evolucao.length ?? 0

  return (
    <div className={styles.pagina}>
      <div className={styles.cabecalho}>
        <h1>Simulador de Investimentos</h1>
        {taxas ? (
          <p className={styles.taxas}>
            {taxas.selic != null ? <span>Selic {formatadorPercentual.format(taxas.selic)}% a.a.</span> : null}
            {taxas.cdi != null ? <span>CDI {formatadorPercentual.format(taxas.cdi)}% a.a.</span> : null}
            {taxas.poupancaMensal != null ? (
              <span>Poupança {formatadorPercentual.format(taxas.poupancaMensal)}% a.m.</span>
            ) : null}
            <span className={styles.fonte}>Fonte: Banco Central</span>
          </p>
        ) : null}
      </div>

      <form className={styles.formulario} onSubmit={handleSubmit}>
        <label className={styles.campo}>
          <span>Valor inicial</span>
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="R$ 0,00"
            value={valorInicial}
            onChange={(event) => setValorInicial(event.target.value)}
          />
        </label>

        <label className={styles.campo}>
          <span>Aporte mensal (opcional)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="R$ 0,00"
            value={aporteMensal}
            onChange={(event) => setAporteMensal(event.target.value)}
          />
        </label>

        <div className={styles.campo}>
          <label htmlFor="prazoSimulacao">Prazo (meses)</label>
          <input
            id="prazoSimulacao"
            type="number"
            min="1"
            max="360"
            step="1"
            value={prazoMeses}
            onChange={(event) => setPrazoMeses(event.target.value)}
          />
          <div className={styles.prazosRapidos}>
            {prazosRapidos.map((meses) => (
              <button
                key={meses}
                type="button"
                className={`${styles.chip} ${Number(prazoMeses) === meses ? styles.chipAtivo : ''}`}
                onClick={() => setPrazoMeses(String(meses))}
              >
                {rotuloPrazo(meses)}
              </button>
            ))}
          </div>
        </div>

        <label className={styles.campo}>
          <span>CDB rende (% do CDI)</span>
          <input
            type="number"
            min="50"
            max="200"
            step="1"
            value={percentualCdi}
            onChange={(event) => setPercentualCdi(event.target.value)}
          />
        </label>

        <button type="submit" className={styles.botaoSimular} disabled={simulando}>
          {simulando ? 'Simulando...' : 'Simular'}
        </button>
      </form>

      {erro ? (
        <p className={styles.errorMessage} aria-live="polite">
          {erro}
        </p>
      ) : null}

      {resultado ? (
        <>
          <p className={styles.resumo}>
            Total investido em {rotuloPrazo(prazoSimulado)}: <strong>{formatadorMoeda.format(resultado.totalInvestido)}</strong>
          </p>

          <div className={styles.cenarios}>
            {resultado.cenarios.map((cenario) => (
              <article
                key={cenario.tipo}
                className={`${styles.cenario} ${resultado.melhorCenario === cenario.tipo ? styles.cenarioMelhor : ''}`}
              >
                <div className={styles.cenarioTopo}>
                  <span className={styles.marcador} style={{ background: coresCenario[cenario.tipo] }} aria-hidden="true" />
                  <h2>{cenario.nome}</h2>
                  {resultado.melhorCenario === cenario.tipo ? (
                    <span className={styles.selo}>
                      <i className="bi bi-trophy-fill" aria-hidden="true" /> Melhor opção
                    </span>
                  ) : null}
                </div>

                {cenario.disponivel ? (
                  <>
                    <span className={styles.taxaCenario}>{formatadorPercentual.format(cenario.taxaAnual)}% ao ano</span>
                    <span className={styles.rotuloValor}>Valor líquido</span>
                    <strong className={styles.valorLiquido}>{formatadorMoeda.format(cenario.valorLiquido)}</strong>
                    <span className={styles.ganho}>+ {formatadorMoeda.format(cenario.rendimentoLiquido)} de rendimento</span>
                    <dl className={styles.detalhes}>
                      <div>
                        <dt>Valor bruto</dt>
                        <dd>{formatadorMoeda.format(cenario.valorBruto)}</dd>
                      </div>
                      <div>
                        <dt>Imposto de Renda</dt>
                        <dd>{cenario.isentoIr ? 'Isento' : `- ${formatadorMoeda.format(cenario.impostoRenda)}`}</dd>
                      </div>
                    </dl>
                  </>
                ) : (
                  <p className={styles.indisponivel}>
                    <i className="bi bi-cloud-slash" aria-hidden="true" /> Taxa indisponível no Banco Central agora.
                    Tente de novo em alguns minutos.
                  </p>
                )}
              </article>
            ))}
          </div>

          {cenariosDisponiveis.length > 0 ? (
            <div className={styles.cardGrafico}>
              <h2>Evolução mês a mês (valor bruto)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={resultado.evolucao} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={false}
                    tickFormatter={(mes) => `${mes}m`}
                    minTickGap={16}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    width={64}
                    domain={['auto', 'auto']}
                    tickFormatter={(valor) => `R$ ${formatadorCompacto.format(valor)}`}
                  />
                  <Tooltip
                    formatter={(valor) => formatadorMoeda.format(valor)}
                    labelFormatter={(mes) => `Mês ${mes}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Line
                    type="monotone"
                    dataKey="investido"
                    name="Valor investido"
                    stroke="#9ca3af"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                  />
                  {cenariosDisponiveis.map((cenario) => (
                    <Line
                      key={cenario.tipo}
                      type="monotone"
                      dataKey={chaveEvolucao[cenario.tipo]}
                      name={cenario.nome}
                      stroke={coresCenario[cenario.tipo]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : null}

          <p className={styles.aviso}>
            Simulação educativa com as taxas de hoje, que podem mudar ao longo do prazo. O IR é regressivo e cobrado
            sobre o rendimento de cada depósito conforme o tempo aplicado (neste prazo, o valor inicial paga{' '}
            {textoAliquotaIr(prazoSimulado)}). Não considera a taxa de custódia do Tesouro Direto nem IOF.
          </p>
        </>
      ) : null}
    </div>
  )
}

export default Simulacao
