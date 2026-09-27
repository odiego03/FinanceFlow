import { useState } from 'react'
import styles from './ModalMeta.module.css'

function ModalAporte({ nomeMeta, onSalvar, onCancelar }) {
  const [valor, setValor] = useState('')
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!valor || Number(valor) <= 0) {
      setErro('Informe um valor válido.')
      return
    }

    setSalvando(true)
    try {
      await onSalvar({ valor: Number(valor), data })
    } catch (erroRequisicao) {
      setErro('Não foi possível registrar o aporte.')
      setSalvando(false)
    }
  }

  return (
    <div className={styles.backdrop} onClick={onCancelar}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <h2>Registrar aporte</h2>
        <p className={styles.ajuda}>Meta: {nomeMeta}</p>

        <form onSubmit={handleSubmit}>
          <label className={styles.label} htmlFor="valorAporte">
            Valor
          </label>
          <input
            id="valorAporte"
            type="number"
            step="0.01"
            min="0.01"
            className={styles.input}
            value={valor}
            onChange={(event) => setValor(event.target.value)}
            autoFocus
          />

          <label className={styles.label} htmlFor="dataAporte">
            Data
          </label>
          <input
            id="dataAporte"
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
              Registrar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ModalAporte
