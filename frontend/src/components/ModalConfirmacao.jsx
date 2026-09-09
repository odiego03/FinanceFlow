import styles from './ModalConfirmacao.module.css'

function ModalConfirmacao({ titulo, mensagem, onConfirmar, onCancelar }) {
  return (
    <div className={styles.backdrop} onClick={onCancelar}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <h2>{titulo}</h2>
        <p className={styles.mensagem}>{mensagem}</p>

        <div className={styles.acoes}>
          <button type="button" className={styles.cancelar} onClick={onCancelar}>
            Cancelar
          </button>
          <button type="button" className={styles.excluir} onClick={onConfirmar}>
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModalConfirmacao
