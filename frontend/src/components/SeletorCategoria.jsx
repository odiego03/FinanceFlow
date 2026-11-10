import IconeCategoria from './IconeCategoria'
import styles from './SeletorCategoria.module.css'

// compacto: pílulas em linha (ícone + nome), pra caber num formulário sem empurrar o resto pra baixo
function SeletorCategoria({ categorias, value, onChange, permitirNenhuma = false, compacto = false }) {
  const tamanhoIcone = compacto ? 22 : 34
  return (
    <div className={compacto ? styles.gradeCompacta : styles.grade} role="listbox">
      {permitirNenhuma ? (
        <button
          type="button"
          className={`${styles.card} ${value === '' ? styles.cardSelecionado : ''}`}
          onClick={() => onChange('')}
          role="option"
          aria-selected={value === ''}
        >
          <IconeCategoria icone="slash-circle" cor="#94a3b8" size={tamanhoIcone} />
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
            <IconeCategoria icone={categoria.icone} cor={categoria.cor} size={tamanhoIcone} />
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
