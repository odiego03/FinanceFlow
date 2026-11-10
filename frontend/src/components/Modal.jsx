import { useEffect, useRef } from 'react'
import styles from './Modal.module.css'

/**
 * Moldura comum dos modais: cabeçalho com título e X, corpo que rola sozinho e rodapé fixo com as ações (os
 * botões nunca somem embaixo do conteúdo). Esc e clique no fundo fecham, a não ser que podeFechar seja false.
 */
function Modal({ titulo, subtitulo, largo = false, podeFechar = true, onFechar, rodape, children }) {
  const caixa = useRef(null)
  const corpo = useRef(null)

  // Foca o que estiver marcado com data-autofoco (inclusive no rodapé, ex: "Cancelar" numa exclusão), senão o
  // primeiro campo do formulário; sem nenhum, a própria caixa
  useEffect(() => {
    const marcado = caixa.current?.querySelector('[data-autofoco]')
    const campo = corpo.current?.querySelector('input:not([type=hidden]):not([disabled]), select, textarea')
    ;(marcado ?? campo ?? caixa.current)?.focus()
  }, [])

  useEffect(() => {
    if (!podeFechar) return undefined
    const fecharNoEsc = (event) => {
      if (event.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', fecharNoEsc)
    return () => window.removeEventListener('keydown', fecharNoEsc)
  }, [podeFechar, onFechar])

  return (
    <div className={styles.backdrop} onClick={podeFechar ? onFechar : undefined}>
      <div
        ref={caixa}
        className={`${styles.caixa} ${largo ? styles.largo : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.cabecalho}>
          <div>
            <h2 id="modal-titulo">{titulo}</h2>
            {subtitulo ? <p>{subtitulo}</p> : null}
          </div>
          {podeFechar ? (
            <button type="button" className={styles.fechar} onClick={onFechar} aria-label="Fechar">
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          ) : null}
        </header>
        <div ref={corpo} className={styles.corpo}>
          {children}
        </div>
        {rodape ? <footer className={styles.rodape}>{rodape}</footer> : null}
      </div>
    </div>
  )
}

export default Modal
