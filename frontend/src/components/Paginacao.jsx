import styles from './Paginacao.module.css'

const TAMANHOS = [20, 50, 100]

// Números das páginas com reticências: 1 … 4 5 6 … 12 (sempre a primeira, a última e duas vizinhas da atual)
function paginasVisiveis(atual, total) {
  const paginas = new Set([1, total, atual - 1, atual, atual + 1].filter((p) => p >= 1 && p <= total))
  const ordenadas = [...paginas].sort((a, b) => a - b)
  const resultado = []
  ordenadas.forEach((pagina, indice) => {
    if (indice > 0 && pagina - ordenadas[indice - 1] > 1) resultado.push(`reticencias-${pagina}`)
    resultado.push(pagina)
  })
  return resultado
}

function Paginacao({ pagina, totalItens, tamanho, onMudarPagina, onMudarTamanho, rotuloItens = 'itens' }) {
  const totalPaginas = Math.max(1, Math.ceil(totalItens / tamanho))
  const inicio = totalItens === 0 ? 0 : (pagina - 1) * tamanho + 1
  const fim = Math.min(totalItens, pagina * tamanho)

  return (
    <nav className={styles.paginacao} aria-label="Paginação">
      <span className={styles.contagem}>
        Mostrando <strong>{inicio}–{fim}</strong> de <strong>{totalItens}</strong> {rotuloItens}
      </span>

      {totalPaginas > 1 ? (
        <div className={styles.paginas}>
          <button
            type="button"
            className={styles.seta}
            onClick={() => onMudarPagina(pagina - 1)}
            disabled={pagina === 1}
            aria-label="Página anterior"
          >
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </button>
          {paginasVisiveis(pagina, totalPaginas).map((item) =>
            typeof item === 'string' ? (
              <span key={item} className={styles.reticencias} aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className={item === pagina ? styles.paginaAtual : styles.pagina}
                aria-current={item === pagina ? 'page' : undefined}
                aria-label={`Página ${item}`}
                onClick={() => onMudarPagina(item)}
              >
                {item}
              </button>
            ),
          )}
          <button
            type="button"
            className={styles.seta}
            onClick={() => onMudarPagina(pagina + 1)}
            disabled={pagina === totalPaginas}
            aria-label="Próxima página"
          >
            <i className="bi bi-chevron-right" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <label className={styles.tamanho}>
        Por página
        <select value={tamanho} onChange={(event) => onMudarTamanho(Number(event.target.value))}>
          {TAMANHOS.map((opcao) => (
            <option key={opcao} value={opcao}>
              {opcao}
            </option>
          ))}
        </select>
      </label>
    </nav>
  )
}

export default Paginacao
