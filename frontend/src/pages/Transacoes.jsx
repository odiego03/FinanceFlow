import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Carregando, Esqueleto } from '../components/Esqueleto'
import IconeCategoria from '../components/IconeCategoria'
import ModalConfirmacao from '../components/ModalConfirmacao'
import ModalContribuicaoMeta from '../components/ModalContribuicaoMeta'
import ModalImportarExtrato from '../components/ModalImportarExtrato'
import ModalTransacao from '../components/ModalTransacao'
import Paginacao from '../components/Paginacao'
import { usePreferencias } from '../contexts/PreferenciasContext'
import { mensagemDeErro } from '../services/api'
import * as categoriaService from '../services/categoriaService'
import * as metaService from '../services/metaService'
import * as parcelamentoService from '../services/parcelamentoService'
import * as transacaoService from '../services/transacaoService'
import { resumirDescricao } from '../utils/descricao'
import styles from './Transacoes.module.css'

const formatadorDia = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
const formatadorDiaComAno = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const formatadorData = new Intl.DateTimeFormat('pt-BR')

const opcoesTipo = [
  { valor: 'TODAS', texto: 'Todas' },
  { valor: 'RECEITA', texto: 'Receitas' },
  { valor: 'DESPESA', texto: 'Despesas' },
]

const opcoesPeriodo = [
  { valor: 'TODOS', texto: 'Todo o período' },
  { valor: 'ESTE_MES', texto: 'Este mês' },
  { valor: 'MES_PASSADO', texto: 'Mês passado' },
  { valor: 'ULTIMOS_3', texto: 'Últimos 3 meses' },
  { valor: 'ULTIMOS_12', texto: 'Últimos 12 meses' },
  { valor: 'PERSONALIZADO', texto: 'Personalizado...' },
]

const opcoesOrdenacao = [
  { valor: 'DATA_DESC', texto: 'Mais recentes' },
  { valor: 'DATA_ASC', texto: 'Mais antigas' },
  { valor: 'VALOR_DESC', texto: 'Maior valor' },
  { valor: 'VALOR_ASC', texto: 'Menor valor' },
]

const FILTROS_INICIAIS = {
  busca: '',
  tipo: 'TODAS',
  periodo: 'TODOS',
  dataInicio: '',
  dataFim: '',
  categoriaId: '',
  valorMinimo: '',
  valorMaximo: '',
  ordenacao: 'DATA_DESC',
}

// Os que ficam escondidos atrás de "Mais filtros": contam no selo do botão
const FILTROS_AVANCADOS = ['categoriaId', 'valorMinimo', 'valorMaximo']

function dataIso(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
}

// Intervalo [inicio, fim] em AAAA-MM-DD (strings ISO comparam certo em ordem alfabética); '' = sem limite
function intervaloDoPeriodo(filtros) {
  const hoje = new Date()
  const inicioDoMes = (mesesAtras) => dataIso(new Date(hoje.getFullYear(), hoje.getMonth() - mesesAtras, 1))
  const fimDoMes = (mesesAtras) => dataIso(new Date(hoje.getFullYear(), hoje.getMonth() - mesesAtras + 1, 0))

  switch (filtros.periodo) {
    case 'ESTE_MES':
      return [inicioDoMes(0), fimDoMes(0)]
    case 'MES_PASSADO':
      return [inicioDoMes(1), fimDoMes(1)]
    case 'ULTIMOS_3':
      return [inicioDoMes(2), fimDoMes(0)]
    case 'ULTIMOS_12':
      return [inicioDoMes(11), fimDoMes(0)]
    case 'PERSONALIZADO':
      return [filtros.dataInicio, filtros.dataFim]
    default:
      return ['', '']
  }
}

function compararTransacoes(ordenacao) {
  switch (ordenacao) {
    case 'DATA_ASC':
      return (a, b) => a.data.localeCompare(b.data) || a.id - b.id
    case 'VALOR_DESC':
      return (a, b) => b.valor - a.valor
    case 'VALOR_ASC':
      return (a, b) => a.valor - b.valor
    default:
      return (a, b) => b.data.localeCompare(a.data) || b.id - a.id
  }
}

function rotuloDia(iso) {
  const hoje = new Date()
  const ontem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1)
  if (iso === dataIso(hoje)) return 'Hoje'
  if (iso === dataIso(ontem)) return 'Ontem'
  const data = new Date(`${iso}T00:00:00`)
  const texto = (data.getFullYear() === hoje.getFullYear() ? formatadorDia : formatadorDiaComAno).format(data)
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// Agrupa os itens da página por dia, mantendo a ordem em que já vieram
function agruparPorDia(transacoes) {
  const grupos = []
  transacoes.forEach((transacao) => {
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.data === transacao.data) {
      ultimo.itens.push(transacao)
    } else {
      grupos.push({ data: transacao.data, itens: [transacao] })
    }
  })
  return grupos
}

function ListaEsqueleto() {
  return (
    <Carregando rotulo="Carregando transações" className={styles.cartaoLista}>
      {[0, 1].map((grupo) => (
        <div key={grupo}>
          <div className={styles.cabecalhoDia}>
            <Esqueleto largura={180} altura={13} />
          </div>
          {[62, 48, 70, 55].map((largura) => (
            <div key={largura} className={styles.linha}>
              <Esqueleto circulo altura={38} />
              <div className={styles.linhaTexto}>
                <Esqueleto largura={`${largura}%`} altura={14} />
                <Esqueleto largura="30%" altura={11} />
              </div>
              <Esqueleto largura={90} altura={16} />
            </div>
          ))}
        </div>
      ))}
    </Carregando>
  )
}

function LinhaTransacao({ transacao, categoria, mostrarData, podeContribuir, formatarMoeda, onContribuir, onEditar, onExcluir }) {
  const receita = transacao.tipo === 'RECEITA'
  const resumo = resumirDescricao(transacao.descricao)
  const titulo = resumo.titulo || transacao.categoriaNome
  const detalhes = [
    transacao.categoriaNome,
    resumo.detalhe,
    transacao.parcelamentoId ? `Parcela ${transacao.numeroParcela}/${transacao.quantidadeParcelas}` : null,
    mostrarData ? formatadorData.format(new Date(`${transacao.data}T00:00:00`)) : null,
  ].filter(Boolean)

  return (
    <li className={styles.linha}>
      <IconeCategoria icone={categoria?.icone ?? 'tag'} cor={categoria?.cor ?? '#94a3b8'} size={38} />
      <div className={styles.linhaTexto} title={transacao.descricao || undefined}>
        <strong>{titulo}</strong>
        <span>
          {detalhes.join(' · ')}
          {transacao.valorContribuidoMetas > 0 ? (
            <span className={styles.seloMeta}>
              <i className="bi bi-bullseye" aria-hidden="true" /> {formatarMoeda(transacao.valorContribuidoMetas)} em metas
            </span>
          ) : null}
        </span>
      </div>
      <strong className={receita ? styles.valorPositivo : styles.valorNegativo}>
        {receita ? '+ ' : '− '}
        {formatarMoeda(transacao.valor)}
      </strong>
      <div className={styles.acoesLinha}>
        {podeContribuir ? (
          <button type="button" onClick={onContribuir} aria-label="Destinar a uma meta" title="Destinar a uma meta">
            <i className="bi bi-bullseye" aria-hidden="true" />
          </button>
        ) : null}
        {!transacao.parcelamentoId ? (
          <button type="button" onClick={onEditar} aria-label="Editar" title="Editar">
            <i className="bi bi-pencil" aria-hidden="true" />
          </button>
        ) : null}
        <button
          type="button"
          className={styles.acaoExcluir}
          onClick={onExcluir}
          aria-label={transacao.parcelamentoId ? 'Excluir parcelamento' : 'Excluir'}
          title={transacao.parcelamentoId ? 'Excluir parcelamento' : 'Excluir'}
        >
          <i className="bi bi-trash3" aria-hidden="true" />
        </button>
      </div>
    </li>
  )
}

function Transacoes() {
  const { formatarMoeda } = usePreferencias()
  const [transacoes, setTransacoes] = useState([])
  const [categorias, setCategorias] = useState([])
  const [metas, setMetas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS)
  const [maisFiltros, setMaisFiltros] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [tamanhoPagina, setTamanhoPagina] = useState(20)
  const [modalAberto, setModalAberto] = useState(false)
  const [transacaoEmEdicao, setTransacaoEmEdicao] = useState(null)
  const [transacaoParaExcluir, setTransacaoParaExcluir] = useState(null)
  const [contribuicaoPendente, setContribuicaoPendente] = useState(null)
  const [modalImportarAberto, setModalImportarAberto] = useState(false)
  const [mensagemSucesso, setMensagemSucesso] = useState('')
  const topoLista = useRef(null)
  const [parametros, setParametros] = useSearchParams()

  const carregarDados = async () => {
    try {
      const [dadosTransacoes, dadosCategorias, dadosMetas] = await Promise.all([
        transacaoService.listar(),
        categoriaService.listar(),
        metaService.listar(),
      ])
      setTransacoes(dadosTransacoes)
      setCategorias(dadosCategorias)
      setMetas(dadosMetas)
    } catch {
      setErro('Não foi possível carregar os dados.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // "Lançar transação" do Dashboard chega com ?nova=1: abre o modal e limpa o parâmetro (voltar não reabre)
  useEffect(() => {
    if (parametros.get('nova') !== '1') return
    setTransacaoEmEdicao(null)
    setModalAberto(true)
    setParametros({}, { replace: true })
  }, [parametros, setParametros])

  const categoriasPorId = useMemo(
    () => Object.fromEntries(categorias.map((categoria) => [categoria.id, categoria])),
    [categorias],
  )

  const transacoesFiltradas = useMemo(() => {
    const termo = filtros.busca.trim().toLowerCase()
    const [inicio, fim] = intervaloDoPeriodo(filtros)
    const valorMinimo = filtros.valorMinimo === '' ? null : Number(filtros.valorMinimo)
    const valorMaximo = filtros.valorMaximo === '' ? null : Number(filtros.valorMaximo)

    return transacoes
      .filter((transacao) => filtros.tipo === 'TODAS' || transacao.tipo === filtros.tipo)
      .filter((transacao) => !filtros.categoriaId || String(transacao.categoriaId) === filtros.categoriaId)
      .filter((transacao) => (!inicio || transacao.data >= inicio) && (!fim || transacao.data <= fim))
      .filter((transacao) => (valorMinimo === null || transacao.valor >= valorMinimo)
        && (valorMaximo === null || transacao.valor <= valorMaximo))
      .filter((transacao) => {
        if (!termo) return true
        return (
          transacao.categoriaNome.toLowerCase().includes(termo) ||
          (transacao.descricao ?? '').toLowerCase().includes(termo)
        )
      })
      .sort(compararTransacoes(filtros.ordenacao))
  }, [transacoes, filtros])

  // Em "mais recentes", o que tem data depois de hoje (parcelas futuras) iria pro topo e esconderia o que já
  // aconteceu: fica num bloco "Agendadas" à parte, do mais próximo pro mais distante
  const hoje = dataIso(new Date())
  const separarAgendadas = filtros.ordenacao === 'DATA_DESC'
  const agendadas = separarAgendadas
    ? transacoesFiltradas.filter((transacao) => transacao.data > hoje).reverse()
    : []
  const realizadas = separarAgendadas
    ? transacoesFiltradas.filter((transacao) => transacao.data <= hoje)
    : transacoesFiltradas

  const totalPaginas = Math.max(1, Math.ceil(realizadas.length / tamanhoPagina))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const daPagina = realizadas.slice((paginaAtual - 1) * tamanhoPagina, paginaAtual * tamanhoPagina)
  // Ordenado por valor, agrupar por dia não faz sentido: vira uma lista só, com a data em cada linha
  const ordenadoPorData = filtros.ordenacao.startsWith('DATA')
  const grupos = ordenadoPorData ? agruparPorDia(daPagina) : [{ data: null, itens: daPagina }]

  const categoriasDoFiltro = categorias
    .filter((categoria) => filtros.tipo === 'TODAS' || categoria.tipo === filtros.tipo)
    .sort((a, b) => a.nome.localeCompare(b.nome))

  const filtrosAtivos = Object.keys(FILTROS_INICIAIS)
    .some((campo) => campo !== 'ordenacao' && filtros[campo] !== FILTROS_INICIAIS[campo])
  const quantidadeAvancados = FILTROS_AVANCADOS.filter((campo) => filtros[campo] !== '').length

  const totalReceitasFiltradas = transacoesFiltradas
    .filter((transacao) => transacao.tipo === 'RECEITA')
    .reduce((soma, transacao) => soma + transacao.valor, 0)
  const totalDespesasFiltradas = transacoesFiltradas
    .filter((transacao) => transacao.tipo === 'DESPESA')
    .reduce((soma, transacao) => soma + transacao.valor, 0)
  const saldoFiltrado = totalReceitasFiltradas - totalDespesasFiltradas

  // Qualquer mudança de filtro volta pra primeira página
  const alterarFiltro = (campos) => {
    setFiltros((atual) => ({ ...atual, ...campos }))
    setPagina(1)
  }

  const limparFiltros = () => {
    setFiltros({ ...FILTROS_INICIAIS, ordenacao: filtros.ordenacao })
    setPagina(1)
  }

  const mudarPagina = (novaPagina) => {
    setPagina(novaPagina)
    topoLista.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  // Trocar o tipo limpa a categoria escolhida se ela for do outro tipo
  const alterarTipo = (tipo) => {
    const categoriaEscolhida = categoriasPorId[filtros.categoriaId]
    const categoriaIncompativel = categoriaEscolhida && tipo !== 'TODAS' && categoriaEscolhida.tipo !== tipo
    alterarFiltro({ tipo, ...(categoriaIncompativel ? { categoriaId: '' } : {}) })
  }

  const abrirNovaTransacao = () => {
    setTransacaoEmEdicao(null)
    setModalAberto(true)
  }

  const abrirEdicao = (transacao) => {
    setTransacaoEmEdicao(transacao)
    setModalAberto(true)
  }

  const fecharModal = () => {
    setModalAberto(false)
    setTransacaoEmEdicao(null)
  }

  const handleSalvar = async (dto) => {
    const estavaEditando = Boolean(transacaoEmEdicao)
    let transacaoSalva
    if (estavaEditando) {
      transacaoSalva = await transacaoService.atualizar(transacaoEmEdicao.id, dto)
    } else {
      transacaoSalva = await transacaoService.criar(dto)
    }
    fecharModal()
    setErro('')
    setMensagemSucesso(estavaEditando ? 'Transação atualizada.' : 'Transação adicionada.')
    await carregarDados()

    if (!estavaEditando && transacaoSalva.tipo === 'RECEITA' && metasPorCategoria(transacaoSalva.categoriaId).length > 0) {
      abrirContribuicaoMeta(transacaoSalva)
    }
  }

  const handleSalvarParcelamento = async (dto) => {
    const parcelamento = await parcelamentoService.criar(dto)
    fecharModal()
    setErro('')
    setMensagemSucesso(
      `Parcelamento criado: ${parcelamento.quantidadeParcelas}x de ${formatarMoeda(parcelamento.valorParcela)}.`,
    )
    await carregarDados()
  }

  const metasPorCategoria = (categoriaId) => metas.filter((meta) => meta.categoriaId === categoriaId)

  const abrirContribuicaoMeta = (transacao) => {
    setContribuicaoPendente({ transacao, metas: metasPorCategoria(transacao.categoriaId) })
  }

  const handleConfirmarContribuicao = async (contribuicoes) => {
    for (const { metaId, valor } of contribuicoes) {
      await metaService.contribuir(metaId, { transacaoId: contribuicaoPendente.transacao.id, valor })
    }
    setContribuicaoPendente(null)
    await carregarDados()
  }

  const handleConcluirImportacao = async (quantidadeCriada, totalDestinadoMetas) => {
    setModalImportarAberto(false)
    setMensagemSucesso(
      `${quantidadeCriada} transação(ões) importada(s) com sucesso.` +
        (totalDestinadoMetas > 0 ? ` ${formatarMoeda(totalDestinadoMetas)} destinado(s) às metas.` : ''),
    )
    await carregarDados()
  }

  // Parcela não se exclui sozinha: a exclusão vai pro parcelamento inteiro (RN004)
  const confirmarExclusao = async () => {
    try {
      if (transacaoParaExcluir.parcelamentoId) {
        await parcelamentoService.excluir(transacaoParaExcluir.parcelamentoId)
      } else {
        await transacaoService.excluir(transacaoParaExcluir.id)
      }
      await carregarDados()
      setTransacaoParaExcluir(null)
    } catch (erroRequisicao) {
      setErro(mensagemDeErro(erroRequisicao, 'Não foi possível excluir a transação.'))
      setTransacaoParaExcluir(null)
    }
  }

  const mensagemExclusao = (transacao) => {
    if (!transacao.parcelamentoId) {
      return `Tem certeza que deseja excluir "${transacao.descricao || transacao.categoriaNome}"? Essa ação não pode ser desfeita.`
    }
    const hoje = dataIso(new Date())
    const futuras = transacoes.filter((t) => t.parcelamentoId === transacao.parcelamentoId && t.data > hoje).length
    return (
      `"${transacao.descricao}" é a parcela ${transacao.numeroParcela} de ${transacao.quantidadeParcelas} de um parcelamento. ` +
      `Excluir o parcelamento apaga ${futuras} parcela(s) futura(s); as que já venceram ficam no histórico. ` +
      'Essa ação não pode ser desfeita.'
    )
  }

  const totalDia = (itens) => itens.reduce((soma, t) => soma + (t.tipo === 'RECEITA' ? t.valor : -t.valor), 0)

  return (
    <div className={styles.pagina}>
      <div className={styles.cabecalho}>
        <div>
          <h1>Transações</h1>
          <p>Tudo o que entrou e saiu da sua conta.</p>
        </div>
        <div className={styles.acoesCabecalho}>
          <button type="button" className={styles.botaoSecundario} onClick={() => setModalImportarAberto(true)}>
            <i className="bi bi-upload" aria-hidden="true" /> Importar extrato
          </button>
          <button type="button" className={styles.botaoPrimario} onClick={abrirNovaTransacao}>
            <i className="bi bi-plus-lg" aria-hidden="true" /> Nova transação
          </button>
        </div>
      </div>

      <div className={styles.resumo}>
        {[
          { rotulo: 'Entradas', valor: totalReceitasFiltradas, classe: styles.valorPositivo, icone: 'arrow-down-circle' },
          { rotulo: 'Saídas', valor: totalDespesasFiltradas, classe: styles.valorNegativo, icone: 'arrow-up-circle' },
          {
            rotulo: 'Saldo',
            valor: saldoFiltrado,
            classe: saldoFiltrado >= 0 ? styles.valorPositivo : styles.valorNegativo,
            icone: 'wallet2',
          },
        ].map((card) => (
          <div key={card.rotulo} className={styles.cardResumo}>
            <span>
              <i className={`bi bi-${card.icone}`} aria-hidden="true" /> {card.rotulo}
            </span>
            {carregando ? (
              <Esqueleto largura="60%" altura={24} raio={8} />
            ) : (
              <strong className={card.classe}>{formatarMoeda(card.valor)}</strong>
            )}
            <small>
              {filtrosAtivos ? 'Com os filtros aplicados' : 'Todo o histórico'}
              {!carregando ? ` · ${transacoesFiltradas.length} lançamento(s)` : ''}
            </small>
          </div>
        ))}
      </div>

      <div className={styles.barraFiltros}>
        <div className={styles.linhaFiltros}>
          <label className={styles.busca}>
            <i className="bi bi-search" aria-hidden="true" />
            <input
              type="search"
              placeholder="Buscar por descrição ou categoria"
              value={filtros.busca}
              onChange={(event) => alterarFiltro({ busca: event.target.value })}
              aria-label="Buscar"
            />
          </label>

          <select
            className={styles.selectFiltro}
            value={filtros.periodo}
            onChange={(event) => alterarFiltro({ periodo: event.target.value })}
            aria-label="Período"
          >
            {opcoesPeriodo.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.texto}
              </option>
            ))}
          </select>

          <div className={styles.segmentado} role="group" aria-label="Tipo">
            {opcoesTipo.map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                aria-pressed={filtros.tipo === opcao.valor}
                className={filtros.tipo === opcao.valor ? styles.segmentoAtivo : ''}
                onClick={() => alterarTipo(opcao.valor)}
              >
                {opcao.texto}
              </button>
            ))}
          </div>

          <button
            type="button"
            className={`${styles.botaoFiltros} ${maisFiltros ? styles.botaoFiltrosAberto : ''}`}
            aria-expanded={maisFiltros}
            onClick={() => setMaisFiltros((atual) => !atual)}
          >
            <i className="bi bi-sliders" aria-hidden="true" /> Mais filtros
            {quantidadeAvancados > 0 ? <span className={styles.seloFiltros}>{quantidadeAvancados}</span> : null}
          </button>
        </div>

        {filtros.periodo === 'PERSONALIZADO' ? (
          <div className={styles.linhaAvancada}>
            <label className={styles.campoFiltro}>
              <span>De</span>
              <input
                type="date"
                value={filtros.dataInicio}
                max={filtros.dataFim || undefined}
                onChange={(event) => alterarFiltro({ dataInicio: event.target.value })}
              />
            </label>
            <label className={styles.campoFiltro}>
              <span>Até</span>
              <input
                type="date"
                value={filtros.dataFim}
                min={filtros.dataInicio || undefined}
                onChange={(event) => alterarFiltro({ dataFim: event.target.value })}
              />
            </label>
          </div>
        ) : null}

        {maisFiltros ? (
          <div className={styles.linhaAvancada}>
            <label className={styles.campoFiltro}>
              <span>Categoria</span>
              <select value={filtros.categoriaId} onChange={(event) => alterarFiltro({ categoriaId: event.target.value })}>
                <option value="">Todas</option>
                {categoriasDoFiltro.map((categoria) => (
                  <option key={categoria.id} value={String(categoria.id)}>
                    {categoria.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.campoFiltro}>
              <span>Valor mínimo</span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="R$ 0,00"
                value={filtros.valorMinimo}
                onChange={(event) => alterarFiltro({ valorMinimo: event.target.value })}
              />
            </label>
            <label className={styles.campoFiltro}>
              <span>Valor máximo</span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="R$ 0,00"
                value={filtros.valorMaximo}
                onChange={(event) => alterarFiltro({ valorMaximo: event.target.value })}
              />
            </label>
            <label className={styles.campoFiltro}>
              <span>Ordenar por</span>
              <select value={filtros.ordenacao} onChange={(event) => alterarFiltro({ ordenacao: event.target.value })}>
                {opcoesOrdenacao.map((opcao) => (
                  <option key={opcao.valor} value={opcao.valor}>
                    {opcao.texto}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {filtrosAtivos ? (
          <button type="button" className={styles.limparFiltros} onClick={limparFiltros}>
            <i className="bi bi-x-circle" aria-hidden="true" /> Limpar filtros
          </button>
        ) : null}
      </div>

      {mensagemSucesso ? (
        <p className={styles.mensagemSucesso} role="status">
          <i className="bi bi-check-circle" aria-hidden="true" /> {mensagemSucesso}
          <button type="button" onClick={() => setMensagemSucesso('')} aria-label="Fechar aviso">
            <i className="bi bi-x" aria-hidden="true" />
          </button>
        </p>
      ) : null}

      {erro ? (
        <p className={styles.errorMessage} role="alert">
          {erro}
        </p>
      ) : null}

      <div ref={topoLista} className={styles.ancoraLista} />

      {carregando ? (
        <ListaEsqueleto />
      ) : transacoes.length === 0 ? (
        <div className={styles.vazio}>
          <i className="bi bi-receipt" aria-hidden="true" />
          <strong>Nenhuma transação ainda</strong>
          <p>Lance sua primeira receita ou despesa, ou importe o extrato do banco para começar.</p>
          <div className={styles.acoesCabecalho}>
            <button type="button" className={styles.botaoSecundario} onClick={() => setModalImportarAberto(true)}>
              <i className="bi bi-upload" aria-hidden="true" /> Importar extrato
            </button>
            <button type="button" className={styles.botaoPrimario} onClick={abrirNovaTransacao}>
              <i className="bi bi-plus-lg" aria-hidden="true" /> Nova transação
            </button>
          </div>
        </div>
      ) : transacoesFiltradas.length === 0 ? (
        <div className={styles.vazio}>
          <i className="bi bi-funnel" aria-hidden="true" />
          <strong>Nada encontrado com esses filtros</strong>
          <p>Tente outro período ou outra busca.</p>
          <button type="button" className={styles.botaoSecundario} onClick={limparFiltros}>
            Limpar filtros
          </button>
        </div>
      ) : (
        <>
          {agendadas.length > 0 ? (
            <details className={styles.agendadas}>
              <summary>
                <i className="bi bi-calendar-event" aria-hidden="true" />
                <span>
                  <strong>Agendadas</strong>
                  <small>
                    {agendadas.length} lançamento(s) com data futura, como parcelas que ainda vão vencer ·{' '}
                    {totalDia(agendadas) >= 0 ? '+ ' : '− '}
                    {formatarMoeda(Math.abs(totalDia(agendadas)))}
                  </small>
                </span>
                <i className={`bi bi-chevron-down ${styles.setaAgendadas}`} aria-hidden="true" />
              </summary>
              <ul className={styles.listaDia}>
                {agendadas.map((transacao) => (
                  <LinhaTransacao
                    key={transacao.id}
                    transacao={transacao}
                    categoria={categoriasPorId[transacao.categoriaId]}
                    mostrarData
                    podeContribuir={false}
                    formatarMoeda={formatarMoeda}
                    onEditar={() => abrirEdicao(transacao)}
                    onExcluir={() => setTransacaoParaExcluir(transacao)}
                  />
                ))}
              </ul>
            </details>
          ) : null}
          {realizadas.length === 0 ? (
            <div className={styles.vazio}>
              <i className="bi bi-calendar-check" aria-hidden="true" />
              <strong>Só há lançamentos agendados neste filtro</strong>
              <p>Abra "Agendadas" acima para ver as parcelas que ainda vão vencer.</p>
            </div>
          ) : (
            <div className={styles.cartaoLista}>
              {grupos.map((grupo) => (
                <section key={grupo.data ?? 'todas'} aria-label={grupo.data ? rotuloDia(grupo.data) : 'Transações'}>
                  {grupo.data ? (
                    <div className={styles.cabecalhoDia}>
                      <span>{rotuloDia(grupo.data)}</span>
                      <span className={totalDia(grupo.itens) >= 0 ? styles.valorPositivo : styles.valorNegativo}>
                        {totalDia(grupo.itens) >= 0 ? '+ ' : '− '}
                        {formatarMoeda(Math.abs(totalDia(grupo.itens)))}
                      </span>
                    </div>
                  ) : null}
                  <ul className={styles.listaDia}>
                    {grupo.itens.map((transacao) => (
                      <LinhaTransacao
                        key={transacao.id}
                        transacao={transacao}
                        categoria={categoriasPorId[transacao.categoriaId]}
                        mostrarData={!ordenadoPorData}
                        podeContribuir={transacao.tipo === 'RECEITA' && metasPorCategoria(transacao.categoriaId).length > 0}
                        formatarMoeda={formatarMoeda}
                        onContribuir={() => abrirContribuicaoMeta(transacao)}
                        onEditar={() => abrirEdicao(transacao)}
                        onExcluir={() => setTransacaoParaExcluir(transacao)}
                      />
                    ))}
                  </ul>
                </section>
              ))}
              <Paginacao
                pagina={paginaAtual}
                totalItens={realizadas.length}
                tamanho={tamanhoPagina}
                rotuloItens="transações"
                onMudarPagina={mudarPagina}
                onMudarTamanho={(tamanho) => {
                  setTamanhoPagina(tamanho)
                  setPagina(1)
                }}
              />
            </div>
          )}
        </>
      )}

      {modalAberto ? (
        <ModalTransacao
          transacaoEmEdicao={transacaoEmEdicao}
          categorias={categorias}
          onSalvar={handleSalvar}
          onSalvarParcelamento={handleSalvarParcelamento}
          onCancelar={fecharModal}
        />
      ) : null}

      {transacaoParaExcluir ? (
        <ModalConfirmacao
          titulo={transacaoParaExcluir.parcelamentoId ? 'Excluir parcelamento' : 'Excluir transação'}
          mensagem={mensagemExclusao(transacaoParaExcluir)}
          onConfirmar={confirmarExclusao}
          onCancelar={() => setTransacaoParaExcluir(null)}
        />
      ) : null}

      {contribuicaoPendente ? (
        <ModalContribuicaoMeta
          transacao={contribuicaoPendente.transacao}
          metas={contribuicaoPendente.metas}
          onConfirmar={handleConfirmarContribuicao}
          onFechar={() => setContribuicaoPendente(null)}
        />
      ) : null}

      {modalImportarAberto ? (
        <ModalImportarExtrato
          categorias={categorias}
          metas={metas}
          onConcluir={handleConcluirImportacao}
          onCancelar={() => setModalImportarAberto(false)}
        />
      ) : null}
    </div>
  )
}

export default Transacoes
