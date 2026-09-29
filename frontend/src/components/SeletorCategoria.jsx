import IconeCategoria from './IconeCategoria'
import styles from './SeletorCategoria.module.css'

function SeletorCategoria({ categorias, value, onChange, permitirNenhuma = false }) {
  return (
    <div className={styles.grade} role="listbox">
      {permitirNenhuma ? (
        <button
          type="button"
          className={`${styles.card} ${value === '' ? styles.cardSelecionado : ''}`}
          onClick={() => onChange('')}
          role="option"
          aria-selected={value === ''}
        >
          <IconeCategoria icone="slash-circle" cor="#94a3b8" />
          <span className={styles.nome}>Sem categoria</span>
        </button>
      ) : null}

      {categorias.map((categoria) => {
        const selecionada = String(value) === String(categoria.id)
        return (
          <button
            key={categoria.id}
            type="button"
            className={`${styles.card} ${selecionada ? styles.cardSelecionado : ''}`}
            onClick={() => onChange(String(categoria.id))}
            role="option"
            aria-selected={selecionada}
          >
            <IconeCategoria icone={categoria.icone} cor={categoria.cor} />
            <span className={styles.nome}>{categoria.nome}</span>
          </button>
        )
      })}

      {categorias.length === 0 && !permitirNenhuma ? (
        <p className={styles.vazio}>Nenhuma categoria disponível para esse tipo.</p>
      ) : null}
    </div>
  )
}

export default SeletorCategoria
