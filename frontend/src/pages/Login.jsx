import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CHAVE_SESSAO_EXPIRADA, mensagemDeErro } from '../services/api'
import * as usuarioService from '../services/usuarioService'
import CampoSenha from '../components/CampoSenha'
import RequisitosSenha from '../components/RequisitosSenha'
import ConfirmacaoPendente from '../components/ConfirmacaoPendente'
import RedefinirSenha from '../components/RedefinirSenha'
import { MENSAGEM_EMAIL, MENSAGEM_SENHA, emailValido, senhaForte } from '../utils/validacao'
import styles from './Login.module.css'

const ABA_LOGIN = 'login'
const ABA_CADASTRO = 'cadastro'

// Aviso deixado pelo interceptor do axios quando o token expira (lido uma vez só)
function lerAvisoSessaoExpirada() {
  try {
    if (sessionStorage.getItem(CHAVE_SESSAO_EXPIRADA)) {
      sessionStorage.removeItem(CHAVE_SESSAO_EXPIRADA)
      return 'Sua sessão expirou. Entre de novo.'
    }
  } catch {
    // sem sessionStorage, segue sem o aviso
  }
  return ''
}

function Login() {
  const { entrar } = useAuth()
  const navigate = useNavigate()
  const [aba, setAba] = useState(ABA_LOGIN)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(lerAvisoSessaoExpirada)
  const [carregando, setCarregando] = useState(false)
  const [redefinindo, setRedefinindo] = useState(false)
  // Conta que precisa confirmar o e-mail: { email, recemCadastrado } enquanto o painel de confirmação está aberto
  const [pendente, setPendente] = useState(null)
  const [sucesso, setSucesso] = useState('')

  const trocarAba = (novaAba) => {
    setAba(novaAba)
    setErro('')
    setSucesso('')
  }

  const concluirRedefinicao = (emailRedefinido) => {
    setRedefinindo(false)
    setAba(ABA_LOGIN)
    setEmail(emailRedefinido)
    setSenha('')
    setErro('')
    setSucesso('Senha redefinida. Entre com a senha nova.')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErro('')
    // Só no cadastro: no login, conta antiga com senha fraca ainda precisa conseguir entrar
    if (aba === ABA_CADASTRO) {
      if (!emailValido(email)) {
        setErro(MENSAGEM_EMAIL)
        return
      }
      if (!senhaForte(senha)) {
        setErro(MENSAGEM_SENHA)
        return
      }
    }
    setCarregando(true)

    try {
      if (aba === ABA_CADASTRO) {
        await usuarioService.cadastrar(nome, email, senha)
        // Sem login automático: a conta só entra depois de clicar no botão do e-mail de confirmação
        setSenha('')
        setPendente({ email: email.trim(), recemCadastrado: true })
        return
      }
      await entrar(email, senha)
      navigate('/dashboard', { replace: true })
    } catch (erroRequisicao) {
      // Senha certa mas e-mail ainda não confirmado (403): leva pro painel que deixa pedir o e-mail de novo
      if (aba === ABA_LOGIN && erroRequisicao.response?.status === 403) {
        setSenha('')
        setPendente({ email: email.trim(), recemCadastrado: false })
        return
      }
      // No login só repassa a mensagem do backend no bloqueio por tentativas (429); senha errada fica genérica
      const bloqueado = erroRequisicao.response?.status === 429
      if (aba === ABA_LOGIN) {
        setErro(bloqueado ? mensagemDeErro(erroRequisicao, 'Muitas tentativas. Tente mais tarde.') : 'Email ou senha inválidos.')
      } else {
        setErro(mensagemDeErro(erroRequisicao, 'Não foi possível criar a conta. Verifique os dados.'))
      }
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main className={styles.screen}>
      <div className={styles.card}>
        <h1 className={styles.titulo}>FinanceFlow</h1>
        <p className={styles.subtitulo}>Gestão financeira inteligente</p>

        {pendente ? (
          <ConfirmacaoPendente
            email={pendente.email}
            recemCadastrado={pendente.recemCadastrado}
            onVoltar={() => {
              setPendente(null)
              setAba(ABA_LOGIN)
              setErro('')
              setSucesso('')
            }}
          />
        ) : redefinindo ? (
          <RedefinirSenha
            emailInicial={email}
            onConcluir={concluirRedefinicao}
            onVoltar={() => {
              setRedefinindo(false)
              setErro('')
            }}
          />
        ) : (
        <>
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
                maxLength={100}
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
          <CampoSenha
            key={aba}
            id="senha"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            autoComplete={aba === ABA_CADASTRO ? 'new-password' : 'current-password'}
            aria-describedby={aba === ABA_CADASTRO ? 'requisitos-senha' : undefined}
            required
          />
          {aba === ABA_CADASTRO ? (
            <RequisitosSenha senha={senha} id="requisitos-senha" />
          ) : (
            <button
              type="button"
              className={`${styles.link} ${styles.linkEsqueci}`}
              onClick={() => {
                setRedefinindo(true)
                setErro('')
                setSucesso('')
              }}
            >
              Esqueci minha senha
            </button>
          )}

          {sucesso ? (
            <p className={styles.avisoSucesso} aria-live="polite">
              <i className="bi bi-check-circle-fill" aria-hidden="true" /> {sucesso}
            </p>
          ) : null}

          {erro ? (
            <p className={styles.errorMessage} aria-live="polite">
              {erro}
            </p>
          ) : null}

          <button type="submit" className={styles.submitButton} disabled={carregando}>
            <i className="bi bi-arrow-right" aria-hidden="true" />{' '}
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
        </>
        )}
      </div>
    </main>
  )
}

export default Login
