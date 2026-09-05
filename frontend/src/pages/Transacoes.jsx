import { useEffect, useMemo, useState } from 'react'
import * as categoriaService from '../services/categoriaService'
import * as transacaoService from '../services/transacaoService'
import styles from './Transacoes.module.css'

const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const valoresIniciaisFormulario = {
  categoriaId: '',
  tipo: 'DESPESA',
  valor: '',
  descricao: '',
  data: new Date().toISOString().slice(0, 10),
}

function Transacoes() {
  const [transacoes, setTransacoes] = useState([])
  const [categorias, setCategorias] = useState([])
  const [formulario, setFormulario] = useState(valoresIniciaisFormulario)
  const [transacaoEmEdicao, setTransacaoEmEdicao] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const carregarDados = async () => {
    try {
      const [dadosTransacoes, dadosCategorias] = await Promise.all([
        transacaoService.listar(),
        categoriaService.listar(),
      ])
      setTransacoes(dadosTransacoes)
      setCategorias(dadosCategorias)
    } catch (erroRequisicao) {
      setErro('Não foi possível carregar os dados.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const categoriasDoTipo = useMemo(
    () => categorias.filter((categoria) => categoria.tipo === formulario.tipo),
    [categorias, formulario.tipo],
  )

  const limparFormulario = () => {
    setFormulario(valoresIniciaisFormulario)
    setTransacaoEmEdicao(null)
  }

  const atualizarCampo = (campo, valor) => {
    setFormulario((atual) => ({ ...atual, [campo]: valor }))
    setErro('')
    setSucesso('')
  }

  const handleSalvar = async (event) => {
    event.preventDefault()

    if (!formulario.categoriaId) {
      setErro('Selecione uma categoria.')
      return
    }

    const dto = {
      categoriaId: Number(formulario.categoriaId),
      tipo: formulario.tipo,
      valor: Number(formulario.valor),
      descricao: formulario.descricao || null,
      data: formulario.data,
    }

    try {
      if (transacaoEmEdicao) {
        await transacaoService.atualizar(transacaoEmEdicao.id, dto)
        setSucesso('Transação atualizada.')
      } else {
        await transacaoService.criar(dto)
        setSucesso('Transação adicionada.')
      }
      limparFormulario()
      await carregarDados()
    } catch (erroRequisicao) {
      setErro('Não foi possível salvar a transação. Confira o tipo e a categoria.')
      setSucesso('')
    }
  }

  const handleEditar = (transacao) => {
    setTransacaoEmEdicao(transacao)
    setFormulario({
      categoriaId: String(transacao.categoriaId),
      tipo: transacao.tipo,
      valor: String(transacao.valor),
      descricao: transacao.descricao ?? '',
      data: transacao.data,
    })
    setErro('')
    setSucesso('')
  }

  const handleExcluir = async (transacao) => {
    try {
      await transacaoService.excluir(transacao.id)
      if (transacaoEmEdicao?.id === transacao.id) {
        limparFormulario()
      }
      await carregarDados()
    } catch (erroRequisicao) {
      setErro('Não foi possível excluir a transação.')
    }
  }

  return (
    <div className={styles.pagina}>
      <h1>Receitas e Despesas</h1>

      <form className={styles.formulario} onSubmit={handleSalvar}>
        <div className={styles.toggleGroup} role="tablist" aria-label="Tipo da transação">
          {['DESPESA', 'RECEITA'].map((tipo) => (
            <button
              key={tipo}
              type="button"
              role="tab"
              aria-selected={formulario.tipo === tipo}
              className={`${styles.toggle} ${formulario.tipo === tipo ? styles.toggleActive : ''}`}
              onClick={() => atualizarCampo('tipo', tipo)}
            >
              {tipo === 'DESPESA' ? 'Despesa' : 'Receita'}
            </button>
          ))}
        </div>

        <div className={styles.linha}>
          <div className={styles.campo}>
            <label className={styles.label} htmlFor="categoria">
              Categoria
            </label>
            <select
              id="categoria"
              className={styles.input}
              value={formulario.categoriaId}
              onChange={(event) => atualizarCampo('categoriaId', event.target.value)}
            >
              <option value="">Selecione</option>
              {categoriasDoTipo.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.campo}>
            <label className={styles.label} htmlFor="valor">
              Valor
            </label>
            <input
              id="valor"
              type="number"
              step="0.01"
              min="0.01"
              className={styles.input}
              value={formulario.valor}
              onChange={(event) => atualizarCampo('valor', event.target.value)}
              required
            />
          </div>
        </div>

        <div className={styles.linha}>
          <div className={styles.campo}>
            <label className={styles.label} htmlFor="data">
              Data
            </label>
            <input
              id="data"
              type="date"
              className={styles.input}
              value={formulario.data}
              onChange={(event) => atualizarCampo('data', event.target.value)}
              required
            />
          </div>

          <div className={styles.campo}>
            <label className={styles.label} htmlFor="descricao">
              Descrição (opcional)
            </label>
            <input
              id="descricao"
              type="text"
              className={styles.input}
              value={formulario.descricao}
              onChange={(event) => atualizarCampo('descricao', event.target.value)}
            />
          </div>
        </div>

        {erro ? (
          <p className={styles.errorMessage} aria-live="polite">
            {erro}
          </p>
        ) : null}

        {sucesso ? (
          <p className={styles.successMessage} aria-live="polite">
            {sucesso}
          </p>
        ) : null}

        <div className={styles.acoesFormulario}>
          <button type="submit" className={styles.submitButton}>
            {transacaoEmEdicao ? '✓ Atualizar transação' : '✓ Salvar transação'}
          </button>
          {transacaoEmEdicao ? (
            <button type="button" className={styles.cancelButton} onClick={limparFormulario}>
              Cancelar edição
            </button>
          ) : null}
        </div>
      </form>

      <div className={styles.lista}>
        {carregando ? (
          <p>Carregando...</p>
        ) : transacoes.length === 0 ? (
          <p className={styles.vazio}>Nenhuma transação registrada ainda.</p>
        ) : (
          transacoes.map((transacao) => (
            <div key={transacao.id} className={styles.linhaTransacao}>
              <div className={styles.infoTransacao}>
                <span className={styles.categoriaNome}>{transacao.categoriaNome}</span>
                <span className={styles.descricao}>{transacao.descricao || transacao.data}</span>
              </div>
              <strong className={transacao.tipo === 'RECEITA' ? styles.valorPositivo : styles.valorNegativo}>
                {transacao.tipo === 'RECEITA' ? '+' : '-'} {formatadorMoeda.format(transacao.valor)}
              </strong>
              <div className={styles.acoes}>
                <button type="button" onClick={() => handleEditar(transacao)} aria-label="Editar transação">
                  ✎
                </button>
                <button type="button" onClick={() => handleExcluir(transacao)} aria-label="Excluir transação">
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Transacoes
