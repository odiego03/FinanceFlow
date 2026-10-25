import { useEffect, useMemo, useState } from 'react'
import ModalConfirmacao from '../components/ModalConfirmacao'
import ModalContribuicaoMeta from '../components/ModalContribuicaoMeta'
import ModalImportarExtrato from '../components/ModalImportarExtrato'
import ModalTransacao from '../components/ModalTransacao'
import { mensagemDeErro } from '../services/api'
import * as categoriaService from '../services/categoriaService'
import * as metaService from '../services/metaService'
import * as parcelamentoService from '../services/parcelamentoService'
import * as transacaoService from '../services/transacaoService'
import styles from './Transacoes.module.css'

const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const formatadorData = new Intl.DateTimeFormat('pt-BR')

const opcoesFiltro = [
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

function Transacoes() {
  const [transacoes, setTransacoes] = useState([])
  const [categorias, setCategorias] = useState([])
  const [metas, setMetas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS)
  const [modalAberto, setModalAberto] = useState(false)
  const [transacaoEmEdicao, setTransacaoEmEdicao] = useState(null)
  const [transacaoParaExcluir, setTransacaoParaExcluir] = useState(null)
  const [contribuicaoPendente, setContribuicaoPendente] = useState(null)
  const [modalImportarAberto, setModalImportarAberto] = useState(false)
  const [mensagemSucesso, setMensagemSucesso] = useState('')

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
    } catch (erroRequisicao) {
      setErro('Não foi possível carregar os dados.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

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

  const categoriasDoFiltro = categorias
    .filter((categoria) => filtros.tipo === 'TODAS' || categoria.tipo === filtros.tipo)
    .sort((a, b) => a.nome.localeCompare(b.nome))

  const filtrosAtivos = Object.keys(FILTROS_INICIAIS)
    .some((campo) => campo !== 'ordenacao' && filtros[campo] !== FILTROS_INICIAIS[campo])

  const totalReceitasFiltradas = transacoesFiltradas
    .filter((transacao) => transacao.tipo === 'RECEITA')
    .reduce((soma, transacao) => soma + transacao.valor, 0)
  const totalDespesasFiltradas = transacoesFiltradas
    .filter((transacao) => transacao.tipo === 'DESPESA')
    .reduce((soma, transacao) => soma + transacao.valor, 0)

  const alterarFiltro = (campos) => setFiltros((atual) => ({ ...atual, ...campos }))

  // Trocar o tipo limpa a categoria escolhida se ela for do outro tipo
  const alterarTipo = (tipo) => {
    const categoriaEscolhida = categorias.find((categoria) => String(categoria.id) === filtros.categoriaId)
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
      `Parcelamento criado: ${parcelamento.quantidadeParcelas}x de ${formatadorMoeda.format(parcelamento.valorParcela)}.`,
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
        (totalDestinadoMetas > 0 ? ` ${formatadorMoeda.format(totalDestinadoMetas)} destinado(s) às metas.` : ''),
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

  return (
    <div className={styles.pagina}>
      <div className={styles.cabecalho}>
        <h1>Receitas e Despesas</h1>
        <div className={styles.acoesCabecalho}>
          <button type="button" className={styles.botaoImportar} onClick={() => setModalImportarAberto(true)}>
            Importar extrato
          </button>
          <button type="button" className={styles.botaoNova} onClick={abrirNovaTransacao}>
            + Nova Transação
          </button>
        </div>
      </div>

      <div className={styles.filtros}>
        <input
          type="text"
          className={styles.busca}
          placeholder="Buscar por descrição ou categoria..."
          value={filtros.busca}
          onChange={(event) => alterarFiltro({ busca: event.target.value })}
        />
        <div className={styles.filtroBotoes}>
          {opcoesFiltro.map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              className={`${styles.filtroBotao} ${filtros.tipo === opcao.valor ? styles.filtroBotaoAtivo : ''}`}
              onClick={() => alterarTipo(opcao.valor)}
            >
              {opcao.texto}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.filtrosAvancados}>
        <label className={styles.campoFiltro}>
          <span>Período</span>
          <select value={filtros.periodo} onChange={(event) => alterarFiltro({ periodo: event.target.value })}>
            {opcoesPeriodo.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.texto}
              </option>
            ))}
          </select>
        </label>

        {filtros.periodo === 'PERSONALIZADO' ? (
          <>
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
          </>
        ) : null}

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
          <span>Valor mín.</span>
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="R$"
            className={styles.campoValor}
            value={filtros.valorMinimo}
            onChange={(event) => alterarFiltro({ valorMinimo: event.target.value })}
          />
        </label>

        <label className={styles.campoFiltro}>
          <span>Valor máx.</span>
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="R$"
            className={styles.campoValor}
            value={filtros.valorMaximo}
            onChange={(event) => alterarFiltro({ valorMaximo: event.target.value })}
          />
        </label>

        <label className={styles.campoFiltro}>
          <span>Ordenar</span>
          <select value={filtros.ordenacao} onChange={(event) => alterarFiltro({ ordenacao: event.target.value })}>
            {opcoesOrdenacao.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.texto}
              </option>
            ))}
          </select>
        </label>

        {filtrosAtivos ? (
          <button
            type="button"
            className={styles.limparFiltros}
            onClick={() => setFiltros({ ...FILTROS_INICIAIS, ordenacao: filtros.ordenacao })}
          >
            Limpar filtros
          </button>
        ) : null}
      </div>

      {!carregando ? (
        <p className={styles.resumoFiltro} aria-live="polite">
          {transacoesFiltradas.length} de {transacoes.length} transação(ões)
          {' · '}
          <span className={styles.valorPositivo}>+ {formatadorMoeda.format(totalReceitasFiltradas)}</span>
          {' · '}
          <span className={styles.valorNegativo}>- {formatadorMoeda.format(totalDespesasFiltradas)}</span>
        </p>
      ) : null}

      {mensagemSucesso ? (
        <p className={styles.mensagemSucesso} aria-live="polite">
          {mensagemSucesso}
        </p>
      ) : null}

      {erro ? (
        <p className={styles.errorMessage} aria-live="polite">
          {erro}
        </p>
      ) : null}

      {carregando ? (
        <p>Carregando...</p>
      ) : transacoesFiltradas.length === 0 ? (
        <p className={styles.vazio}>Nenhuma transação encontrada.</p>
      ) : (
        <div className={styles.tabelaWrapper}>
          <table className={styles.tabela}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {transacoesFiltradas.map((transacao) => (
                <tr key={transacao.id}>
                  <td>{formatadorData.format(new Date(`${transacao.data}T00:00:00`))}</td>
                  <td>
                    <div className={styles.badgesTipo}>
                      <span className={transacao.tipo === 'RECEITA' ? styles.badgeReceita : styles.badgeDespesa}>
                        {transacao.tipo === 'RECEITA' ? 'Receita' : 'Despesa'}
                      </span>
                      {transacao.parcelamentoId ? (
                        <span className={styles.badgeParcela} title="Parcela de um parcelamento">
                          <i className="bi bi-credit-card" aria-hidden="true" /> {transacao.numeroParcela}/
                          {transacao.quantidadeParcelas}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td>{transacao.categoriaNome}</td>
                  <td>{transacao.descricao || '-'}</td>
                  <td className={transacao.tipo === 'RECEITA' ? styles.valorPositivo : styles.valorNegativo}>
                    {transacao.tipo === 'RECEITA' ? '+ ' : '- '}
                    {formatadorMoeda.format(transacao.valor)}
                  </td>
                  <td>
                    <div className={styles.acoesLinha}>
                      {transacao.tipo === 'RECEITA' && metasPorCategoria(transacao.categoriaId).length > 0 ? (
                        <button
                          type="button"
                          onClick={() => abrirContribuicaoMeta(transacao)}
                          aria-label="Adicionar a uma meta financeira"
                          title="Adicionar a uma meta financeira"
                        >
                          🎯
                        </button>
                      ) : null}
                      {!transacao.parcelamentoId ? (
                        <button type="button" onClick={() => abrirEdicao(transacao)} aria-label="Editar transação">
                          ✎
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setTransacaoParaExcluir(transacao)}
                        aria-label={transacao.parcelamentoId ? 'Excluir parcelamento' : 'Excluir transação'}
                        title={transacao.parcelamentoId ? 'Excluir parcelamento' : undefined}
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
