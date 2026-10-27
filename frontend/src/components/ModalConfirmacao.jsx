import { useState } from 'react'
import Modal from './Modal'
import styles from './ModalConfirmacao.module.css'

function ModalConfirmacao({ titulo, mensagem, textoConfirmar = 'Excluir', onConfirmar, onCancelar }) {
  const [confirmando, setConfirmando] = useState(false)

  // Trava o botão enquanto a exclusão roda: dois cliques não mandam duas requisições
  const confirmar = async () => {
    setConfirmando(true)
    try {
      await onConfirmar()
    } finally {
      setConfirmando(false)
    }
  }

  return (
    <Modal
      titulo={titulo}
      onFechar={onCancelar}
      rodape={
        <>
          <button type="button" className={styles.cancelar} onClick={onCancelar} data-autofoco>
            Cancelar
          </button>
          <button type="button" className={styles.excluir} onClick={confirmar} disabled={confirmando}>
            {confirmando ? 'Excluindo...' : textoConfirmar}
          </button>
        </>
      }
    >
      <div className={styles.conteudo}>
        <span className={styles.icone} aria-hidden="true">
          <i className="bi bi-exclamation-triangle" />
        </span>
        <p className={styles.mensagem}>{mensagem}</p>
      </div>
    </Modal>
  )
}

export default ModalConfirmacao
