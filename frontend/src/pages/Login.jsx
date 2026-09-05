import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import styles from './Login.module.css'

function Login() {
  const { entrar } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErro('')
    setCarregando(true)

    try {
      await entrar(email, senha)
      navigate('/categorias', { replace: true })
    } catch (erroRequisicao) {
      setErro('Email ou senha inválidos.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main className={styles.screen}>
      <h1 className={styles.titulo}>FinanceFlow</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.label} htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          className={styles.input}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label className={styles.label} htmlFor="senha">
          Senha
        </label>
        <input
          id="senha"
          type="password"
          className={styles.input}
          value={senha}
          onChange={(event) => setSenha(event.target.value)}
          required
        />

        {erro ? (
          <p className={styles.errorMessage} aria-live="polite">
            {erro}
          </p>
        ) : null}

        <button type="submit" className={styles.submitButton} disabled={carregando}>
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}

export default Login
