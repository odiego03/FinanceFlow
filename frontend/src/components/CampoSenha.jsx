import { useState } from 'react'
import loginStyles from '../pages/Login.module.css'
import styles from './CampoSenha.module.css'

/**
 * Campo de senha com botão de mostrar/ocultar (olho). Nasce sempre oculto. Recebe as mesmas props de um <input>
 * (id, value, onChange, autoComplete, required...) e usa o visual dos campos das telas de login.
 */
function CampoSenha(props) {
  const [visivel, setVisivel] = useState(false)

  return (
    <div className={styles.envoltorio}>
      <input {...props} type={visivel ? 'text' : 'password'} className={`${loginStyles.input} ${styles.campo}`} />
      <button
        type="button"
        className={styles.alternar}
        onClick={() => setVisivel((atual) => !atual)}
        aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visivel}
        title={visivel ? 'Ocultar senha' : 'Mostrar senha'}
      >
        <i className={`bi ${visivel ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
      </button>
    </div>
  )
}

export default CampoSenha
