import styles from './Esqueleto.module.css'

// Bloco cinza com brilho passando, no formato do conteúdo que ainda vai chegar
export function Esqueleto({ largura = '100%', altura = 14, raio = 6, circulo = false, className = '' }) {
  return (
    <span
      className={`${styles.bloco} ${className}`}
      style={{
        width: circulo ? altura : largura,
        height: altura,
        borderRadius: circulo ? '50%' : raio,
      }}
    />
  )
}

// Algumas linhas de texto; a última mais curta, como um parágrafo de verdade
export function EsqueletoTexto({ linhas = 2, altura = 12, ultimaLargura = '60%' }) {
  return (
    <span className={styles.texto}>
      {Array.from({ length: linhas }, (_, indice) => (
        <Esqueleto key={indice} altura={altura} largura={indice === linhas - 1 && linhas > 1 ? ultimaLargura : '100%'} />
      ))}
    </span>
  )
}

/**
 * Envolve os blocos de uma área que está carregando: leitor de tela ouve só "Carregando ...", e os blocos ficam
 * escondidos dele. Aceita className pra herdar o layout (grid, card) da área de verdade.
 */
export function Carregando({ rotulo = 'Carregando', className = '', children }) {
  return (
    <div className={className} role="status" aria-live="polite" aria-busy="true">
      <span className={styles.somenteLeitor}>{rotulo}...</span>
      <div aria-hidden="true" className={styles.conteudo}>
        {children}
      </div>
    </div>
  )
}
