import { useEffect, useMemo, useState } from 'react'
import { Carregando, Esqueleto } from '../components/Esqueleto'
import { useAuth } from '../contexts/AuthContext'
import { usePreferencias } from '../contexts/PreferenciasContext'
import { mensagemDeErro } from '../services/api'
import * as relatorioService from '../services/relatorioService'
import * as transacaoService from '../services/transacaoService'
import { baixarCsv, CABECALHO_TRANSACOES, linhasDeTransacoes } from '../utils/csv'
import styles from './Relatorios.module.css'

const nomesMeses = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

const formatadorPercentual = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const formatadorData = new Intl.DateTimeFormat('pt-BR')

function rotuloReferencia(tipo, referencia) {
  if (tipo === 'ANUAL') return referencia
  const [ano, mes] = referencia.split('-')
  return `${nomesMeses[Number(mes) - 1]} de ${ano}`
}

function rotuloMesCurto(mesIso) {
  const nome = nomesMeses[Number(mesIso.slice(5, 7)) - 1]
  return nome.charAt(0).toUpperCase() + nome.slice(1)
}

// Mesmo critério do Dashboard: abre no mês mais recente que tem lançamento, ignorando parcelas futuras
function mesInicial(transacoes) {
  const hoje = new Date().toLocaleDateString('sv-SE')
  const datas = transacoes.map((t) => t.data).filter((data) => data <= hoje)
  return (datas.length > 0 ? datas.reduce((a, b) => (a > b ? a : b)) : hoje).slice(0, 7)
}

// "Bom" depende do que se mede: despesa subir é ruim, receita e saldo subirem é bom
function Variacao({ atual, anterior, maiorEhMelhor, rotuloAnterior, emPontos = false }) {
  if (anterior === null || anterior === undefined || atual === null || atual === undefined) return null
  let texto
  let direcao
  if (emPontos) {
    const diferenca = atual - anterior
    direcao = Math.sign(Math.round(diferenca * 10))
    texto = `${diferenca > 0 ? '+' : ''}${formatadorPercentual.format(diferenca)} p.p.`
  } else {
    if (anterior === 0) {
      return <span className={styles.variacaoNeutra}>sem base em {rotuloAnterior}</span>
    }
    const percentual = ((atual - anterior) / Math.abs(anterior)) * 100
    direcao = Math.sign(Math.round(percentual * 10))
    texto = `${percentual > 0 ? '+' : ''}${formatadorPercentual.format(percentual)}%`
  }
  if (direcao === 0) {
    return <span className={styles.variacaoNeutra}>igual a {rotuloAnterior}</span>
  }
  const bom = maiorEhMelhor ? direcao > 0 : direcao < 0
  return (
    <span className={bom ? styles.variacaoBoa : styles.variacaoRuim}>
      <i className={`bi bi-arrow-${direcao > 0 ? 'up' : 'down'}-right`} aria-hidden="true" /> {texto} vs {rotuloAnterior}
    </span>
  )
}

function TabelaCategorias({ titulo, linhas, maiorEhMelhor, rotuloAnterior, formatarMoeda }) {
  if (linhas.length === 0) {
    return (
      <section className={styles.card}>
        <h3>{titulo}</h3>
        <p className={styles.vazio}>Nenhum lançamento.</p>
      </section>
    )
  }
  return (
    <section className={styles.card}>
      <h3>{titulo}</h3>
      <div className={styles.tabelaWrapper}>
        <table className={styles.tabela}>
          <thead>
            <tr>
              <th>Categoria</th>
              <th className={styles.numero}>Valor</th>
              <th className={styles.numero}>% do total</th>
              <th className={styles.numero}>{rotuloAnterior}</th>
              <th className={styles.numero}>Variação</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={linha.categoriaId}>
                <td>
                  <span className={styles.marcador} style={{ background: linha.cor || 'var(--texto-fraco)' }} aria-hidden="true" />
                  {linha.categoriaNome}
                </td>
                <td className={styles.numero}>{formatarMoeda(linha.total)}</td>
                <td className={styles.numero}>{formatadorPercentual.format(linha.percentual)}%</td>
                <td className={styles.numero}>{formatarMoeda(linha.totalAnterior)}</td>
                <td className={styles.numero}>
                  {linha.variacao === null ? (
                    <span className={styles.variacaoNeutra}>novo</span>
                  ) : (
                    <span
                      className={
                        linha.variacao === 0
                          ? styles.variacaoNeutra
                          : (linha.variacao > 0) === maiorEhMelhor
                            ? styles.variacaoBoa
                            : styles.variacaoRuim
                      }
                    >
                      {linha.variacao > 0 ? '+' : ''}
                      {formatadorPercentual.format(linha.variacao)}%
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function exportarCsv(transacoes, relatorio, rotulo) {
  const doPeriodo = transacoes.filter((t) => t.data >= relatorio.inicio && t.data <= relatorio.fim)
  baixarCsv(`financeflow-${rotulo.replaceAll(' ', '-')}.csv`, [CABECALHO_TRANSACOES, ...linhasDeTransacoes(doPeriodo)])
}

function Relatorios() {
  const { usuario } = useAuth()
  const { formatarMoeda } = usePreferencias()
  const [transacoes, setTransacoes] = useState([])
  const [carregandoTransacoes, setCarregandoTransacoes] = useState(true)
  const [tipo, setTipo] = useState('MENSAL')
  const [referenciaEscolhida, setReferenciaEscolhida] = useState(null)
  const [resposta, setResposta] = useState({ chave: null, relatorio: null, erro: '' })

  useEffect(() => {
    transacaoService
      .listar()
      .then(setTransacoes)
      .catch(() => setResposta({ chave: null, relatorio: null, erro: 'Não foi possível carregar as transações.' }))
      .finally(() => setCarregandoTransacoes(false))
  }, [])

  const mesAtual = new Date().toLocaleDateString('sv-SE').slice(0, 7)
  const opcoes = useMemo(() => {
    const meses = new Set(transacoes.map((t) => t.data.slice(0, 7)))
    meses.add(mesAtual)
    const ordenados = [...meses].sort().reverse()
    return {
      MENSAL: ordenados,
      ANUAL: [...new Set(ordenados.map((mes) => mes.slice(0, 4)))],
    }
  }, [transacoes, mesAtual])

  const padrao = tipo === 'MENSAL' ? mesInicial(transacoes) : mesInicial(transacoes).slice(0, 4)
  const referencia = referenciaEscolhida ?? padrao
  const chave = `${tipo}|${referencia}`
  const carregando = carregandoTransacoes || resposta.chave !== chave

  useEffect(() => {
    if (carregandoTransacoes) return
    relatorioService
      .gerar(tipo, referencia)
      .then((relatorio) => setResposta({ chave, relatorio, erro: '' }))
      .catch((erro) => setResposta({ chave, relatorio: null, erro: mensagemDeErro(erro, 'Não foi possível gerar o relatório.') }))
  }, [tipo, referencia, chave, carregandoTransacoes])

  const trocarTipo = (novoTipo) => {
    setTipo(novoTipo)
    setReferenciaEscolhida(null)
  }

  const relatorio = resposta.relatorio
  const rotulo = rotuloReferencia(tipo, referencia)
  const rotuloAnterior = relatorio ? rotuloReferencia(tipo, relatorio.referenciaAnterior) : ''
  const totalAnual = relatorio?.evolucaoMensal.reduce(
    (soma, mes) => ({ receitas: soma.receitas + mes.totalReceitas, despesas: soma.despesas + mes.totalDespesas }),
    { receitas: 0, despesas: 0 },
  )

  return (
    <div className={styles.pagina}>
      <div className={styles.cabecalho}>
        <h1>Relatórios</h1>
        <div className={styles.acoesCabecalho}>
          <button
            type="button"
            className={styles.botaoSecundario}
            disabled={!relatorio || carregando}
            onClick={() => exportarCsv(transacoes, relatorio, rotulo)}
          >
            <i className="bi bi-filetype-csv" aria-hidden="true" /> Exportar CSV
          </button>
          <button type="button" className={styles.botaoPrimario} disabled={!relatorio || carregando} onClick={() => window.print()}>
            <i className="bi bi-printer" aria-hidden="true" /> Imprimir / PDF
          </button>
        </div>
      </div>

      <div className={styles.controles}>
        <div className={styles.segmentado} role="group" aria-label="Tipo de relatório">
          {[
            { valor: 'MENSAL', texto: 'Mensal' },
            { valor: 'ANUAL', texto: 'Anual' },
          ].map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              aria-pressed={tipo === opcao.valor}
              className={tipo === opcao.valor ? styles.segmentoAtivo : ''}
              onClick={() => trocarTipo(opcao.valor)}
            >
              {opcao.texto}
            </button>
          ))}
        </div>
        <label className={styles.seletor}>
          <span>{tipo === 'MENSAL' ? 'Mês' : 'Ano'}</span>
          <select
            value={referencia}
            onChange={(event) => setReferenciaEscolhida(event.target.value)}
            disabled={carregandoTransacoes}
          >
            {opcoes[tipo].map((opcao) => (
              <option key={opcao} value={opcao}>
                {rotuloReferencia(tipo, opcao)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {resposta.erro ? <p className={styles.erro}>{resposta.erro}</p> : null}

      {carregando ? (
        <Carregando rotulo="Gerando relatório" className={styles.esqueleto}>
          <Esqueleto largura="40%" altura={22} />
          <Esqueleto largura="28%" altura={13} />
          <div className={styles.resumo}>
            {['Receitas', 'Despesas', 'Saldo', 'Taxa de poupança'].map((rotulo) => (
              <div key={rotulo} className={styles.card}>
                <span className={styles.rotuloResumo}>{rotulo}</span>
                <Esqueleto largura="70%" altura={26} raio={8} />
                <Esqueleto largura="50%" altura={12} />
              </div>
            ))}
          </div>
          <div className={styles.card}>
            <Esqueleto largura="30%" altura={18} />
            {[80, 65, 72, 50, 60].map((largura) => (
              <div key={largura} className={styles.esqueletoLinha}>
                <Esqueleto largura={`${largura}%`} />
                <Esqueleto largura={90} />
              </div>
            ))}
          </div>
        </Carregando>
      ) : relatorio ? (
        <>
          <div className={styles.titulo}>
            <h2>
              Relatório {tipo === 'MENSAL' ? 'mensal' : 'anual'} · {rotulo}
            </h2>
            <span>
              {usuario?.nome} · comparado com {rotuloAnterior} · gerado em {formatadorData.format(new Date())}
            </span>
          </div>

          {relatorio.atual.quantidadeTransacoes === 0 ? (
            <p className={styles.vazio}>Nenhuma transação em {rotulo}.</p>
          ) : (
            <>
              <div className={styles.resumo}>
                <div className={styles.card}>
                  <span className={styles.rotuloResumo}>Receitas</span>
                  <strong>{formatarMoeda(relatorio.atual.receitas)}</strong>
                  <Variacao atual={relatorio.atual.receitas} anterior={relatorio.anterior.receitas} maiorEhMelhor rotuloAnterior={rotuloAnterior} />
                </div>
                <div className={styles.card}>
                  <span className={styles.rotuloResumo}>Despesas</span>
                  <strong>{formatarMoeda(relatorio.atual.despesas)}</strong>
                  <Variacao atual={relatorio.atual.despesas} anterior={relatorio.anterior.despesas} maiorEhMelhor={false} rotuloAnterior={rotuloAnterior} />
                </div>
                <div className={styles.card}>
                  <span className={styles.rotuloResumo}>Saldo</span>
                  <strong>{formatarMoeda(relatorio.atual.saldo)}</strong>
                  <Variacao atual={relatorio.atual.saldo} anterior={relatorio.anterior.saldo} maiorEhMelhor rotuloAnterior={rotuloAnterior} />
                </div>
                <div className={styles.card}>
                  <span className={styles.rotuloResumo} title="Quanto da renda sobrou: saldo ÷ receitas">
                    Taxa de poupança
                  </span>
                  <strong>
                    {relatorio.atual.taxaPoupanca === null ? '—' : `${formatadorPercentual.format(relatorio.atual.taxaPoupanca)}%`}
                  </strong>
                  <Variacao
                    atual={relatorio.atual.taxaPoupanca}
                    anterior={relatorio.anterior.taxaPoupanca}
                    maiorEhMelhor
                    emPontos
                    rotuloAnterior={rotuloAnterior}
                  />
                </div>
              </div>

              {tipo === 'ANUAL' ? (
                <section className={styles.card}>
                  <h3>Mês a mês</h3>
                  <div className={styles.tabelaWrapper}>
                    <table className={styles.tabela}>
                      <thead>
                        <tr>
                          <th>Mês</th>
                          <th className={styles.numero}>Receitas</th>
                          <th className={styles.numero}>Despesas</th>
                          <th className={styles.numero}>Saldo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {relatorio.evolucaoMensal.map((mes) => {
                          const saldo = mes.totalReceitas - mes.totalDespesas
                          return (
                            <tr key={mes.mes}>
                              <td>{rotuloMesCurto(mes.mes)}</td>
                              <td className={styles.numero}>{formatarMoeda(mes.totalReceitas)}</td>
                              <td className={styles.numero}>{formatarMoeda(mes.totalDespesas)}</td>
                              <td className={`${styles.numero} ${saldo < 0 ? styles.negativo : ''}`}>{formatarMoeda(saldo)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>Total</td>
                          <td className={styles.numero}>{formatarMoeda(totalAnual.receitas)}</td>
                          <td className={styles.numero}>{formatarMoeda(totalAnual.despesas)}</td>
                          <td className={styles.numero}>{formatarMoeda(totalAnual.receitas - totalAnual.despesas)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>
              ) : null}

              <TabelaCategorias
                titulo="Despesas por categoria"
                linhas={relatorio.despesasPorCategoria}
                maiorEhMelhor={false}
                rotuloAnterior={rotuloAnterior}
                formatarMoeda={formatarMoeda}
              />
              <TabelaCategorias
                titulo="Receitas por categoria"
                linhas={relatorio.receitasPorCategoria}
                maiorEhMelhor
                rotuloAnterior={rotuloAnterior}
                formatarMoeda={formatarMoeda}
              />

              {relatorio.maioresDespesas.length > 0 ? (
                <section className={styles.card}>
                  <h3>Maiores despesas</h3>
                  <div className={styles.tabelaWrapper}>
                    <table className={styles.tabela}>
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Descrição</th>
                          <th>Categoria</th>
                          <th className={styles.numero}>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {relatorio.maioresDespesas.map((despesa, indice) => (
                          <tr key={`${despesa.data}-${indice}`}>
                            <td>{formatadorData.format(new Date(`${despesa.data}T00:00:00`))}</td>
                            <td>{despesa.descricao || '-'}</td>
                            <td>{despesa.categoriaNome}</td>
                            <td className={styles.numero}>{formatarMoeda(despesa.valor)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}
            </>
          )}
        </>
      ) : null}
    </div>
  )
}

export default Relatorios
