import { useCallback, useEffect, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Carregando, Esqueleto } from '../components/Esqueleto'
import { usePreferencias } from '../contexts/PreferenciasContext'
import { mensagemDeErro } from '../services/api'
import * as metaService from '../services/metaService'
import * as parcelamentoService from '../services/parcelamentoService'
import * as simulacaoService from '../services/simulacaoService'
import { estiloTooltip } from '../utils/graficos'
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

const MODO_RESULTADO = 'RESULTADO'
const MODO_META = 'META'

// A cor segue o cenário, nunca a posição no ranking
const coresCenario = {
  POUPANCA: 'var(--serie-2)',
  CDB: 'var(--serie-1)',
  TESOURO_SELIC: 'var(--serie-3)',
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
  if (meses > 12) {
    const anos = Math.floor(meses / 12)
    const resto = meses % 12
    return `${anos} ${anos === 1 ? 'ano' : 'anos'} e ${resto} ${resto === 1 ? 'mês' : 'meses'}`
  }
  return meses === 1 ? '1 mês' : `${meses} meses`
}

function textoAliquotaIr(meses) {
  if (meses <= 6) return '22,5%'
  if (meses <= 12) return '20%'
  if (meses <= 24) return '17,5%'
  return '15%'
}

// Meses de hoje até a data-alvo da meta (contando o mês atual como o 1º), entre 1 e 360
function mesesAte(dataIso) {
  const hoje = new Date()
  const [ano, mes] = dataIso.split('-').map(Number)
  const meses = (ano - hoje.getFullYear()) * 12 + (mes - 1 - hoje.getMonth())
  return Math.min(360, Math.max(1, meses))
}

function emDinheiroDeHoje(valor, meses, ipca) {
  return valor / (1 + ipca / 100) ** (meses / 12)
}

// Primeiro mês em que o rendimento daquele mês passa o aporte: é quando os juros "trabalham" mais que você
function mesEmQueJurosPassamOAporte(evolucao, chave, valorInicial, aporte) {
  if (aporte <= 0) return null
  let saldoAnterior = valorInicial
  for (const ponto of evolucao) {
    const saldo = ponto[chave]
    if (saldo == null) return null
    if (saldo - saldoAnterior - aporte >= aporte) return ponto.mes
    saldoAnterior = saldo
  }
  return null
}

// Sobra média = renda − despesas − parcelas agendadas, a mesma conta da sugestão de parcelamento
function SobraMedia({ sobra, carregando, onUsar }) {
  const { formatarMoeda } = usePreferencias()
  if (carregando) {
    return (
      <Carregando rotulo="Calculando sua sobra média">
        <Esqueleto largura={190} altura={24} raio={999} />
      </Carregando>
    )
  }
  if (!sobra) return null
  if (sobra.margemLivre == null) {
    return <small className={styles.dica}>Lance suas receitas para o simulador saber quanto sobra por mês.</small>
  }
  if (sobra.margemLivre <= 0) {
    return (
      <small className={styles.dica}>
        Nos últimos 3 meses suas despesas e parcelas usaram toda a renda: não sobrou para investir.
      </small>
    )
  }
  return (
    <button
      type="button"
      className={styles.botaoSobra}
      onClick={onUsar}
      title="Renda média − despesas − parcelas agendadas, nos últimos 3 meses completos"
    >
      <i className="bi bi-magic" aria-hidden="true" /> Usar minha sobra ({formatarMoeda(sobra.margemLivre)}/mês)
    </button>
  )
}

// Três cards no formato dos cenários, enquanto a primeira simulação não chega
function CenariosEsqueleto() {
  return (
    <Carregando rotulo="Simulando" className={styles.cenarios}>
      {['POUPANCA', 'CDB', 'TESOURO_SELIC'].map((tipo) => (
        <div key={tipo} className={styles.cenario}>
          <div className={styles.cenarioTopo}>
            <Esqueleto circulo altura={10} />
            <Esqueleto largura="45%" altura={16} />
          </div>
          <Esqueleto largura="30%" altura={12} />
          <Esqueleto largura="60%" altura={30} raio={8} />
          <Esqueleto largura="50%" altura={13} />
          <div className={styles.detalhes}>
            <Esqueleto altura={12} />
            <Esqueleto altura={12} />
            <Esqueleto largura="70%" altura={12} />
          </div>
        </div>
      ))}
    </Carregando>
  )
}

function Destaques({ itens }) {
  if (itens.length === 0) return null
  return (
    <ul className={styles.destaques}>
      {itens.map((item) => (
        <li key={item.texto} className={styles[item.tom] ?? ''}>
          <i className={`bi bi-${item.icone}`} aria-hidden="true" />
          <span>{item.texto}</span>
        </li>
      ))}
    </ul>
  )
}

function SeloInflacao({ cenario }) {
  if (cenario.rendimentoReal == null) return null
  const ganha = cenario.rendimentoReal >= 0
  return (
    <span className={ganha ? styles.inflacaoGanha : styles.inflacaoPerde}>
      <i className={`bi bi-${ganha ? 'arrow-up-right' : 'arrow-down-right'}`} aria-hidden="true" />
      {ganha ? 'Ganha' : 'Perde'} da inflação: {ganha ? '+' : '−'} {formatadorMoeda.format(Math.abs(cenario.rendimentoReal))}
    </span>
  )
}

function Simulacao() {
  const { preferencias, formatarMoeda } = usePreferencias()
  const [modo, setModo] = useState(MODO_RESULTADO)
  const [valorInicial, setValorInicial] = useState('1000')
  const [aporteMensal, setAporteMensal] = useState('200')
  const [valorObjetivo, setValorObjetivo] = useState('20000')
  const [prazoMeses, setPrazoMeses] = useState(String(preferencias.simuladorPrazoMeses))
  const [percentualCdi, setPercentualCdi] = useState(String(preferencias.simuladorPercentualCdi))
  const [editado, setEditado] = useState(false)
  const [taxas, setTaxas] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [resultadoMeta, setResultadoMeta] = useState(null)
  const [erro, setErro] = useState('')
  const [simulando, setSimulando] = useState(false)
  const [sobra, setSobra] = useState(null)
  const [carregandoSobra, setCarregandoSobra] = useState(true)
  const [metas, setMetas] = useState([])
  const [metaEscolhida, setMetaEscolhida] = useState('')

  const editar = (setter) => (event) => {
    setEditado(true)
    setter(event.target.value)
  }

  const simularResultado = useCallback(async ({ inicial, aporte, prazo, cdi }) => {
    setErro('')
    setSimulando(true)
    try {
      const resposta = await simulacaoService.simular({
        valorInicial: inicial,
        aporteMensal: aporte,
        prazoMeses: prazo,
        percentualCdi: cdi,
      })
      setResultado({ ...resposta, valorInicial: inicial, aporteMensal: aporte })
      setTaxas(resposta.taxas)
    } catch (erroRequisicao) {
      setErro(mensagemDeErro(erroRequisicao, 'Não foi possível simular agora.'))
    } finally {
      setSimulando(false)
    }
  }, [])

  // A página já abre com uma simulação; se as preferências chegarem depois (reload direto aqui) e o usuário ainda
  // não mexeu em nada, refaz com o prazo e o % do CDI dele
  useEffect(() => {
    if (editado) return
    setPrazoMeses(String(preferencias.simuladorPrazoMeses))
    setPercentualCdi(String(preferencias.simuladorPercentualCdi))
    simularResultado({
      inicial: 1000,
      aporte: 200,
      prazo: preferencias.simuladorPrazoMeses,
      cdi: preferencias.simuladorPercentualCdi,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferencias.simuladorPrazoMeses, preferencias.simuladorPercentualCdi, simularResultado])

  useEffect(() => {
    parcelamentoService
      .sugestao()
      .then(setSobra)
      .catch(() => setSobra(null))
      .finally(() => setCarregandoSobra(false))
    metaService
      .listar()
      .then((lista) => setMetas(lista.filter((meta) => meta.valorAtual < meta.valorAlvo)))
      .catch(() => setMetas([]))
  }, [])

  const validarPrazo = (prazo) => Number.isInteger(prazo) && prazo >= 1 && prazo <= 360

  const handleSubmit = async (event) => {
    event.preventDefault()
    const inicial = valorInicial === '' ? 0 : Number(valorInicial)
    const prazo = Number(prazoMeses)
    const cdi = percentualCdi === '' ? null : Number(percentualCdi)

    if (!validarPrazo(prazo)) {
      setErro('O prazo deve ser entre 1 e 360 meses.')
      return
    }
    if (inicial < 0) {
      setErro('O valor inicial não pode ser negativo.')
      return
    }

    if (modo === MODO_RESULTADO) {
      const aporte = aporteMensal === '' ? 0 : Number(aporteMensal)
      if (aporte < 0) {
        setErro('O aporte não pode ser negativo.')
        return
      }
      if (inicial === 0 && aporte === 0) {
        setErro('Informe um valor inicial ou um aporte mensal.')
        return
      }
      await simularResultado({ inicial, aporte, prazo, cdi })
      return
    }

    const objetivo = Number(valorObjetivo)
    if (!(objetivo > 0)) {
      setErro('Informe quanto você quer juntar.')
      return
    }
    setErro('')
    setSimulando(true)
    try {
      const resposta = await simulacaoService.aporteNecessario({
        valorObjetivo: objetivo,
        valorInicial: inicial,
        prazoMeses: prazo,
        percentualCdi: cdi,
      })
      setResultadoMeta(resposta)
      setTaxas(resposta.taxas)
    } catch (erroRequisicao) {
      setErro(mensagemDeErro(erroRequisicao, 'Não foi possível calcular agora.'))
    } finally {
      setSimulando(false)
    }
  }

  const usarSobra = () => {
    setEditado(true)
    setAporteMensal(String(sobra.margemLivre))
  }

  const escolherMeta = (event) => {
    const id = event.target.value
    setMetaEscolhida(id)
    const meta = metas.find((item) => String(item.id) === id)
    if (!meta) return
    setEditado(true)
    setValorObjetivo(String(Math.round((meta.valorAlvo - meta.valorAtual) * 100) / 100))
    setValorInicial('')
    if (meta.dataAlvo) setPrazoMeses(String(mesesAte(meta.dataAlvo)))
  }

  // "Simular este aporte" no modo meta: leva o aporte encontrado pro modo resultado e já simula
  const simularAporte = (cenario) => {
    const inicial = valorInicial === '' ? 0 : Number(valorInicial)
    const prazo = Number(prazoMeses)
    const cdi = percentualCdi === '' ? null : Number(percentualCdi)
    setEditado(true)
    setModo(MODO_RESULTADO)
    setAporteMensal(String(cenario.aporteMensal))
    simularResultado({ inicial, aporte: cenario.aporteMensal, prazo, cdi })
  }

  const trocarModo = (novoModo) => {
    setModo(novoModo)
    setErro('')
  }

  const cenariosDisponiveis = resultado?.cenarios.filter((cenario) => cenario.disponivel) ?? []
  const prazoSimulado = resultado?.evolucao.length ?? 0

  const destaquesResultado = []
  if (resultado && cenariosDisponiveis.length > 0) {
    const ordenados = [...cenariosDisponiveis].sort((a, b) => b.valorLiquido - a.valorLiquido)
    const melhor = ordenados[0]
    const pior = ordenados[ordenados.length - 1]
    if (ordenados.length > 1 && melhor.valorLiquido - pior.valorLiquido >= 0.01) {
      destaquesResultado.push({
        icone: 'trophy',
        tom: 'destaquePositivo',
        texto: `Escolhendo ${melhor.nome} em vez de ${pior.nome}, você termina com ${formatadorMoeda.format(
          melhor.valorLiquido - pior.valorLiquido,
        )} a mais.`,
      })
    }
    const ipca = resultado.taxas.ipca12Meses
    if (ipca != null) {
      const perdem = cenariosDisponiveis.filter((cenario) => cenario.rendimentoReal < 0)
      destaquesResultado.push(
        perdem.length > 0
          ? {
              icone: 'exclamation-triangle',
              tom: 'destaqueAlerta',
              texto: `Com a inflação de ${formatadorPercentual.format(ipca)}% ao ano, ${perdem
                .map((cenario) => cenario.nome)
                .join(' e ')} ${perdem.length > 1 ? 'perdem' : 'perde'} poder de compra: o dinheiro rende, mas compra menos no fim.`,
            }
          : {
              icone: 'shield-check',
              tom: 'destaquePositivo',
              texto: `Todas as opções ganham da inflação (${formatadorPercentual.format(ipca)}% nos últimos 12 meses).`,
            },
      )
    }
    const mesJuros = mesEmQueJurosPassamOAporte(
      resultado.evolucao,
      chaveEvolucao[melhor.tipo],
      resultado.valorInicial,
      resultado.aporteMensal,
    )
    if (mesJuros) {
      destaquesResultado.push({
        icone: 'graph-up-arrow',
        tom: 'destaqueNeutro',
        texto: `Juros compostos: no ${melhor.nome}, a partir do mês ${mesJuros} (${rotuloPrazo(
          mesJuros,
        )}) os juros de um mês já rendem mais que o seu aporte.`,
      })
    }
  }

  const destaquesMeta = []
  if (resultadoMeta) {
    const melhor = resultadoMeta.cenarios.find((cenario) => cenario.tipo === resultadoMeta.melhorCenario)
    const ipca = resultadoMeta.taxas.ipca12Meses
    if (melhor && sobra?.margemLivre > 0) {
      const diferenca = sobra.margemLivre - melhor.aporteMensal
      destaquesMeta.push(
        diferenca >= 0
          ? {
              icone: 'check-circle',
              tom: 'destaquePositivo',
              texto: `Cabe no seu bolso: sua sobra média é ${formatarMoeda(sobra.margemLivre)}/mês, e no ${
                melhor.nome
              } ainda sobram ${formatarMoeda(diferenca)} por mês.`,
            }
          : {
              icone: 'exclamation-triangle',
              tom: 'destaqueAlerta',
              texto: `Hoje sua sobra média é ${formatarMoeda(sobra.margemLivre)}/mês: faltam ${formatarMoeda(
                -diferenca,
              )} por mês. Aumente o prazo ou reduza o objetivo.`,
            },
      )
    }
    if (ipca != null) {
      destaquesMeta.push({
        icone: 'info-circle',
        tom: 'destaqueNeutro',
        texto: `Com a inflação de ${formatadorPercentual.format(ipca)}% ao ano, ${formatadorMoeda.format(
          resultadoMeta.valorObjetivo,
        )} daqui a ${rotuloPrazo(resultadoMeta.prazoMeses)} compram o que ${formatadorMoeda.format(
          emDinheiroDeHoje(resultadoMeta.valorObjetivo, resultadoMeta.prazoMeses, ipca),
        )} compram hoje.`,
      })
    }
  }

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
            {taxas.ipca12Meses != null ? (
              <span>Inflação (IPCA) {formatadorPercentual.format(taxas.ipca12Meses)}% em 12 meses</span>
            ) : null}
            <span className={styles.fonte}>Fonte: Banco Central</span>
          </p>
        ) : null}
      </div>

      <div className={styles.modos} role="tablist" aria-label="O que você quer saber">
        <button
          type="button"
          role="tab"
          aria-selected={modo === MODO_RESULTADO}
          className={modo === MODO_RESULTADO ? styles.modoAtivo : styles.modo}
          onClick={() => trocarModo(MODO_RESULTADO)}
        >
          <i className="bi bi-graph-up" aria-hidden="true" />
          <span>
            Quanto vou ter?
            <small>Informe quanto investir e veja o resultado</small>
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={modo === MODO_META}
          className={modo === MODO_META ? styles.modoAtivo : styles.modo}
          onClick={() => trocarModo(MODO_META)}
        >
          <i className="bi bi-bullseye" aria-hidden="true" />
          <span>
            Quanto preciso investir?
            <small>Informe seu objetivo e veja o aporte mensal</small>
          </span>
        </button>
      </div>

      <form className={styles.formulario} onSubmit={handleSubmit}>
        {modo === MODO_META ? (
          <>
            {metas.length > 0 ? (
              <label className={`${styles.campo} ${styles.campoLargo}`}>
                <span>Usar uma das suas metas (opcional)</span>
                <select value={metaEscolhida} onChange={escolherMeta}>
                  <option value="">Escolha uma meta...</option>
                  {metas.map((meta) => (
                    <option key={meta.id} value={meta.id}>
                      {meta.nome} — faltam {formatarMoeda(meta.valorAlvo - meta.valorAtual)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className={styles.campo}>
              <span>Quero juntar</span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="R$ 0,00"
                value={valorObjetivo}
                onChange={editar(setValorObjetivo)}
              />
            </label>
            <label className={styles.campo}>
              <span>Já tenho (opcional)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="R$ 0,00"
                value={valorInicial}
                onChange={editar(setValorInicial)}
              />
            </label>
          </>
        ) : (
          <>
            <label className={styles.campo}>
              <span>Valor inicial</span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="R$ 0,00"
                value={valorInicial}
                onChange={editar(setValorInicial)}
              />
            </label>
            <div className={styles.campo}>
              <label htmlFor="aporteSimulacao">Aporte mensal (opcional)</label>
              <input
                id="aporteSimulacao"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="R$ 0,00"
                value={aporteMensal}
                onChange={editar(setAporteMensal)}
              />
              <SobraMedia sobra={sobra} carregando={carregandoSobra} onUsar={usarSobra} />
            </div>
          </>
        )}

        <div className={styles.campo}>
          <label htmlFor="prazoSimulacao">{modo === MODO_META ? 'Em quanto tempo (meses)' : 'Prazo (meses)'}</label>
          <input
            id="prazoSimulacao"
            type="number"
            min="1"
            max="360"
            step="1"
            value={prazoMeses}
            onChange={editar(setPrazoMeses)}
          />
          <div className={styles.prazosRapidos}>
            {prazosRapidos.map((meses) => (
              <button
                key={meses}
                type="button"
                className={`${styles.chip} ${Number(prazoMeses) === meses ? styles.chipAtivo : ''}`}
                onClick={() => {
                  setEditado(true)
                  setPrazoMeses(String(meses))
                }}
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
            onChange={editar(setPercentualCdi)}
          />
        </label>

        <button type="submit" className={styles.botaoSimular} disabled={simulando}>
          {simulando ? 'Calculando...' : modo === MODO_META ? 'Calcular aporte' : 'Simular'}
        </button>
      </form>

      {erro ? (
        <p className={styles.errorMessage} aria-live="polite">
          {erro}
        </p>
      ) : null}

      {simulando && (modo === MODO_META ? !resultadoMeta : !resultado) ? <CenariosEsqueleto /> : null}

      {modo === MODO_META && resultadoMeta ? (
        <>
          <p className={styles.resumo}>
            Para ter <strong>{formatadorMoeda.format(resultadoMeta.valorObjetivo)}</strong> em{' '}
            {rotuloPrazo(resultadoMeta.prazoMeses)}, já descontado o Imposto de Renda:
          </p>
          <Destaques itens={destaquesMeta} />
          <div className={styles.cenarios}>
            {resultadoMeta.cenarios.map((cenario) => (
              <article
                key={cenario.tipo}
                className={`${styles.cenario} ${resultadoMeta.melhorCenario === cenario.tipo ? styles.cenarioMelhor : ''}`}
              >
                <div className={styles.cenarioTopo}>
                  <span className={styles.marcador} style={{ background: coresCenario[cenario.tipo] }} aria-hidden="true" />
                  <h2>{cenario.nome}</h2>
                  {resultadoMeta.melhorCenario === cenario.tipo ? (
                    <span className={styles.selo}>
                      <i className="bi bi-lightning-charge-fill" aria-hidden="true" /> Menor esforço
                    </span>
                  ) : null}
                </div>
                {cenario.disponivel ? (
                  <>
                    <span className={styles.rotuloValor}>Investir por mês</span>
                    <strong className={styles.valorLiquido}>
                      {cenario.aporteMensal === 0 ? 'Nada' : formatadorMoeda.format(cenario.aporteMensal)}
                    </strong>
                    <span className={styles.ganho}>
                      {cenario.aporteMensal === 0
                        ? 'O que você já tem chega lá sozinho'
                        : `Os juros fazem ${formatadorMoeda.format(cenario.rendimentoLiquido)} do caminho`}
                    </span>
                    <dl className={styles.detalhes}>
                      <div>
                        <dt>Você coloca no total</dt>
                        <dd>{formatadorMoeda.format(cenario.totalInvestido)}</dd>
                      </div>
                      <div>
                        <dt>Imposto de Renda</dt>
                        <dd>{cenario.isentoIr ? 'Isento' : 'Já descontado'}</dd>
                      </div>
                    </dl>
                    {cenario.aporteMensal > 0 ? (
                      <button type="button" className={styles.botaoLink} onClick={() => simularAporte(cenario)}>
                        Ver mês a mês com esse aporte <i className="bi bi-arrow-right" aria-hidden="true" />
                      </button>
                    ) : null}
                  </>
                ) : (
                  <p className={styles.indisponivel}>
                    <i className="bi bi-cloud-slash" aria-hidden="true" /> Taxa indisponível no Banco Central agora.
                  </p>
                )}
              </article>
            ))}
          </div>
          <p className={styles.aviso}>
            Cálculo com as taxas de hoje, que podem mudar ao longo do prazo. O aporte entra no fim de cada mês e o
            objetivo é o valor que fica com você, depois do Imposto de Renda.
          </p>
        </>
      ) : null}

      {modo === MODO_RESULTADO && resultado ? (
        <>
          <p className={styles.resumo}>
            Total investido em {rotuloPrazo(prazoSimulado)}: <strong>{formatadorMoeda.format(resultado.totalInvestido)}</strong>
          </p>
          <Destaques itens={destaquesResultado} />

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
                      {cenario.valorLiquidoHoje != null ? (
                        <div>
                          <dt>Em dinheiro de hoje</dt>
                          <dd>{formatadorMoeda.format(cenario.valorLiquidoHoje)}</dd>
                        </div>
                      ) : null}
                    </dl>
                    <SeloInflacao cenario={cenario} />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--borda)" vertical={false} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 12, fill: 'var(--texto-suave)' }}
                    axisLine={{ stroke: 'var(--borda)' }}
                    tickLine={false}
                    tickFormatter={(mes) => `${mes}m`}
                    minTickGap={16}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: 'var(--texto-suave)' }}
                    axisLine={false}
                    tickLine={false}
                    width={78}
                    domain={['auto', 'auto']}
                    tickFormatter={(valor) => `R$ ${formatadorCompacto.format(valor)}`}
                  />
                  <Tooltip
                    contentStyle={estiloTooltip}
                    formatter={(valor) => formatadorMoeda.format(valor)}
                    labelFormatter={(mes) => `Mês ${mes}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Line
                    type="monotone"
                    dataKey="investido"
                    name="Valor investido"
                    stroke="var(--serie-neutra)"
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
            {textoAliquotaIr(prazoSimulado)}). "Em dinheiro de hoje" desconta a inflação dos últimos 12 meses como se
            ela se repetisse no prazo todo. Não considera a taxa de custódia do Tesouro Direto nem IOF.
          </p>
        </>
      ) : null}
    </div>
  )
}

export default Simulacao
