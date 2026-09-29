import { useEffect, useMemo, useState } from 'react'
import ModalConfirmacao from '../components/ModalConfirmacao'
import ModalContribuicaoMeta from '../components/ModalContribuicaoMeta'
import ModalTransacao from '../components/ModalTransacao'
import * as categoriaService from '../services/categoriaService'
import * as metaService from '../services/metaService'
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

function Transacoes() {
  const [transacoes, setTransacoes] = useState([])
  const [categorias, setCategorias] = useState([])
  const [metas, setMetas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('TODAS')
  const [modalAberto, setModalAberto] = useState(false)
  const [transacaoEmEdicao, setTransacaoEmEdicao] = useState(null)
  const [transacaoParaExcluir, setTransacaoParaExcluir] = useState(null)
  const [contribuicaoPendente, setContribuicaoPendente] = useState(null)

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
    const termo = busca.trim().toLowerCase()
    return transacoes
      .filter((transacao) => filtro === 'TODAS' || transacao.tipo === filtro)
      .filter((transacao) => {
        if (!termo) return true
        return (
          transacao.categoriaNome.toLowerCase().includes(termo) ||
          (transacao.descricao ?? '').toLowerCase().includes(termo)
        )
      })
  }, [transacoes, filtro, busca])

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

  const confirmarExclusao = async () => {
    try {
      await transacaoService.excluir(transacaoParaExcluir.id)
      await carregarDados()
      setTransacaoParaExcluir(null)
    } catch (erroRequisicao) {
      setErro('Não foi possível excluir a transação.')
      setTransacaoParaExcluir(null)
    }
  }

  return (
    <div className={styles.pagina}>
      <div className={styles.cabecalho}>
        <h1>Receitas e Despesas</h1>
        <button type="button" className={styles.botaoNova} onClick={abrirNovaTransacao}>
          + Nova Transação
        </button>
      </div>

      <div className={styles.filtros}>
        <input
          type="text"
          className={styles.busca}
          placeholder="Buscar transações..."
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
        />
        <div className={styles.filtroBotoes}>
          {opcoesFiltro.map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              className={`${styles.filtroBotao} ${filtro === opcao.valor ? styles.filtroBotaoAtivo : ''}`}
              onClick={() => setFiltro(opcao.valor)}
            >
              {opcao.texto}
            </button>
          ))}
        </div>
      </div>

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
                    <span className={transacao.tipo === 'RECEITA' ? styles.badgeReceita : styles.badgeDespesa}>
                      {transacao.tipo === 'RECEITA' ? 'Receita' : 'Despesa'}
                    </span>
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
                      <button type="button" onClick={() => abrirEdicao(transacao)} aria-label="Editar transação">
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransacaoParaExcluir(transacao)}
                        aria-label="Excluir transação"
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
          onCancelar={fecharModal}
        />
      ) : null}

      {transacaoParaExcluir ? (
        <ModalConfirmacao
          titulo="Excluir transação"
          mensagem={`Tem certeza que deseja excluir "${transacaoParaExcluir.descricao || transacaoParaExcluir.categoriaNome}"? Essa ação não pode ser desfeita.`}
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
    </div>
  )
}

export default Transacoes
