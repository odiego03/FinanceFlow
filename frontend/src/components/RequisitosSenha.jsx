import { REQUISITOS_SENHA } from '../utils/validacao'
import styles from './RequisitosSenha.module.css'

// Lista do que a senha precisa ter, marcando o que já foi atendido enquanto a pessoa digita (ícone + texto, nunca só cor)
function RequisitosSenha({ senha, id }) {
  return (
    <ul className={styles.lista} id={id} aria-label="Requisitos da senha">
      {REQUISITOS_SENHA.map((requisito) => {
        const atende = requisito.atende(senha)
        return (
          <li key={requisito.id} className={atende ? styles.atendido : styles.pendente}>
            <i className={`bi ${atende ? 'bi-check-circle-fill' : 'bi-circle'}`} aria-hidden="true" />
            {requisito.texto}
            <span className={styles.somenteLeitor}>{atende ? ' (ok)' : ' (falta)'}</span>
          </li>
        )
      })}
    </ul>
  )
}

export default RequisitosSenha
