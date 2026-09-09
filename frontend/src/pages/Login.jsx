import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import * as usuarioService from '../services/usuarioService'
import styles from './Login.module.css'

const ABA_LOGIN = 'login'
const ABA_CADASTRO = 'cadastro'

function Login() {
  const { entrar } = useAuth()
  const navigate = useNavigate()
  const [aba, setAba] = useState(ABA_LOGIN)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const trocarAba = (novaAba) => {
    setAba(novaAba)
    setErro('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErro('')
    setCarregando(true)

    try {
      if (aba === ABA_CADASTRO) {
        await usuarioService.cadastrar(nome, email, senha)
      }
      await entrar(email, senha)
      navigate('/dashboard', { replace: true })
    } catch (erroRequisicao) {
      setErro(
        aba === ABA_LOGIN
          ? 'Email ou senha inválidos.'
          : 'Não foi possível criar a conta. Verifique os dados.',
      )
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main className={styles.screen}>
      <div className={styles.card}>
        <h1 className={styles.titulo}>FinanceFlow</h1>
        <p className={styles.subtitulo}>Gestão financeira inteligente</p>

        <div className={styles.toggleGroup} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={aba === ABA_LOGIN}
            className={`${styles.toggle} ${aba === ABA_LOGIN ? styles.toggleActive : ''}`}
            onClick={() => trocarAba(ABA_LOGIN)}
          >
            Login
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={aba === ABA_CADASTRO}
            className={`${styles.toggle} ${aba === ABA_CADASTRO ? styles.toggleActive : ''}`}
            onClick={() => trocarAba(ABA_CADASTRO)}
          >
            Cadastro
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {aba === ABA_CADASTRO ? (
            <>
              <label className={styles.label} htmlFor="nome">
                Nome
              </label>
              <input
                id="nome"
                type="text"
                className={styles.input}
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                required
              />
            </>
          ) : null}

          <label className={styles.label} htmlFor="email">
            E-mail
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
            <span aria-hidden="true">→</span>{' '}
            {aba === ABA_LOGIN
              ? carregando
                ? 'Entrando...'
                : 'Entrar'
              : carregando
                ? 'Cadastrando...'
                : 'Cadastrar'}
          </button>
        </form>

        <p className={styles.trocaAba}>
          {aba === ABA_LOGIN ? (
            <>
              Não tem uma conta?{' '}
              <button type="button" className={styles.link} onClick={() => trocarAba(ABA_CADASTRO)}>
                Cadastre-se
              </button>
            </>
          ) : (
            <>
              Já tem uma conta?{' '}
              <button type="button" className={styles.link} onClick={() => trocarAba(ABA_LOGIN)}>
                Entrar
              </button>
            </>
          )}
        </p>
      </div>
    </main>
  )
}

export default Login
