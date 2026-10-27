import { useState } from 'react'
import styles from './ModalCategoria.module.css'

function ModalCategoria({ categoriaEmEdicao, onSalvar, onCancelar }) {
  const [nome, setNome] = useState(categoriaEmEdicao?.nome ?? '')
  const [tipo, setTipo] = useState(categoriaEmEdicao?.tipo ?? 'RECEITA')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nomeLimpo = nome.trim()
    if (!nomeLimpo) {
      setErro('Informe o nome da categoria.')
      return
    }

    setSalvando(true)
    try {
      await onSalvar({ nome: nomeLimpo, tipo })
    } catch (erroRequisicao) {
      setErro('Não foi possível salvar a categoria.')
      setSalvando(false)
    }
  }

  return (
    <div className={styles.backdrop} onClick={onCancelar}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <h2>{categoriaEmEdicao ? 'Editar Categoria' : 'Nova Categoria'}</h2>

        <form onSubmit={handleSubmit}>
          <label className={styles.label} htmlFor="nomeCategoria">
            Nome da Categoria
          </label>
          <input
            id="nomeCategoria"
            type="text"
            className={styles.input}
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            maxLength={50}
            autoFocus
          />
          <span className={styles.contador}>{nome.length}/50 caracteres</span>

          <span className={styles.label}>Tipo</span>
          <div className={styles.tipoGroup}>
            <button
              type="button"
              className={`${styles.tipoBotao} ${tipo === 'RECEITA' ? styles.tipoReceitaAtivo : ''}`}
              onClick={() => setTipo('RECEITA')}
            >
              Receita
            </button>
            <button
              type="button"
              className={`${styles.tipoBotao} ${tipo === 'DESPESA' ? styles.tipoDespesaAtivo : ''}`}
              onClick={() => setTipo('DESPESA')}
            >
              Despesa
            </button>
          </div>

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
              {categoriaEmEdicao ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ModalCategoria
