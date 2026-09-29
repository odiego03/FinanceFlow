import { useMemo, useState } from 'react'
import SeletorCategoria from './SeletorCategoria'
import styles from './ModalTransacao.module.css'

function ModalTransacao({ transacaoEmEdicao, categorias, onSalvar, onCancelar }) {
  const [tipo, setTipo] = useState(transacaoEmEdicao?.tipo ?? 'DESPESA')
  const [categoriaId, setCategoriaId] = useState(
    transacaoEmEdicao ? String(transacaoEmEdicao.categoriaId) : '',
  )
  const [valor, setValor] = useState(transacaoEmEdicao ? String(transacaoEmEdicao.valor) : '')
  const [descricao, setDescricao] = useState(transacaoEmEdicao?.descricao ?? '')
  const [data, setData] = useState(transacaoEmEdicao?.data ?? new Date().toISOString().slice(0, 10))
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const categoriasDoTipo = useMemo(() => categorias.filter((c) => c.tipo === tipo), [categorias, tipo])

  const trocarTipo = (novoTipo) => {
    setTipo(novoTipo)
    setCategoriaId('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!categoriaId) {
      setErro('Selecione uma categoria.')
      return
    }
    if (!valor || Number(valor) <= 0) {
      setErro('Informe um valor válido.')
      return
    }

    setSalvando(true)
    try {
      await onSalvar({
        categoriaId: Number(categoriaId),
        tipo,
        valor: Number(valor),
        descricao: descricao || null,
        data,
      })
    } catch (erroRequisicao) {
      setErro('Não foi possível salvar a transação.')
      setSalvando(false)
    }
  }

  return (
    <div className={styles.backdrop} onClick={onCancelar}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <h2>{transacaoEmEdicao ? 'Editar Transação' : 'Nova Transação'}</h2>

        <form onSubmit={handleSubmit}>
          <span className={styles.label}>Tipo</span>
          <div className={styles.tipoGroup}>
            <button
              type="button"
              className={`${styles.tipoBotao} ${tipo === 'RECEITA' ? styles.tipoReceitaAtivo : ''}`}
              onClick={() => trocarTipo('RECEITA')}
            >
              Receita
            </button>
            <button
              type="button"
              className={`${styles.tipoBotao} ${tipo === 'DESPESA' ? styles.tipoDespesaAtivo : ''}`}
              onClick={() => trocarTipo('DESPESA')}
            >
              Despesa
            </button>
          </div>

          <label className={styles.label} htmlFor="valorTransacao">
            Valor
          </label>
          <input
            id="valorTransacao"
            type="number"
            step="0.01"
            min="0.01"
            className={styles.input}
            value={valor}
            onChange={(event) => setValor(event.target.value)}
          />

          <span className={styles.label}>Categoria</span>
          <SeletorCategoria categorias={categoriasDoTipo} value={categoriaId} onChange={setCategoriaId} />

          <label className={styles.label} htmlFor="descricaoTransacao">
            Descrição
          </label>
          <input
            id="descricaoTransacao"
            type="text"
            className={styles.input}
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
            maxLength={200}
          />
          <span className={styles.contador}>{descricao.length}/200 caracteres</span>

          <label className={styles.label} htmlFor="dataTransacao">
            Data
          </label>
          <input
            id="dataTransacao"
            type="date"
            className={styles.input}
            value={data}
            onChange={(event) => setData(event.target.value)}
          />

          {erro ? (
            <p className={styles.errorMessage} aria-live="polite">
              {erro}
            </p>
          ) : null}

          <div className={styles.acoes}>
            <button type="button" className={styles.cancelar} onClick={onCancelar}>
              Cancelar
            </button>
            <button type="submit" className={styles.adicionar} disabled={salvando}>
              {transacaoEmEdicao ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ModalTransacao
