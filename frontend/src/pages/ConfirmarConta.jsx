import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { mensagemDeErro } from '../services/api'
import * as usuarioService from '../services/usuarioService'
import styles from './Login.module.css'

const ESTADO_CONFIRMANDO = 'confirmando'
const ESTADO_CONFIRMADA = 'confirmada'
const ESTADO_INVALIDO = 'invalido'

/**
 * Página aberta pelo botão "Confirmar conta" do e-mail (/confirmar-conta?token=...): confirma a conta ao carregar.
 * É uma página do frontend, e não um link direto pra API, pra um leitor de links de e-mail (que só abre a URL e não
 * roda o JavaScript da página) não confirmar a conta sozinho. Pública: abre com ou sem login.
 */
function ConfirmarConta() {
  const [parametros] = useSearchParams()
  const navigate = useNavigate()
  const token = parametros.get('token')
  const [estado, setEstado] = useState(token ? ESTADO_CONFIRMANDO : ESTADO_INVALIDO)
  const [mensagem, setMensagem] = useState(token ? '' : 'O link está incompleto.')
  // O link só vale uma vez: sem isso, o modo de desenvolvimento do React (que roda o efeito duas vezes) gastaria o
  // token na primeira chamada e mostraria "link inválido" na segunda
  const jaChamou = useRef(false)

  useEffect(() => {
    if (!token || jaChamou.current) {
      return
    }
    jaChamou.current = true
    usuarioService
      .confirmarEmail(token)
      .then(() => setEstado(ESTADO_CONFIRMADA))
      .catch((erroRequisicao) => {
        setMensagem(mensagemDeErro(erroRequisicao, 'Não foi possível confirmar a conta. Tente de novo.'))
        setEstado(ESTADO_INVALIDO)
      })
  }, [token])

  const irParaLogin = () => navigate('/login', { replace: true })

  return (
    <main className={styles.screen}>
      <div className={styles.card}>
        <h1 className={styles.titulo}>FinanceFlow</h1>
        <p className={styles.subtitulo}>Gestão financeira inteligente</p>

        {estado === ESTADO_CONFIRMANDO ? (
          <>
            <h2 className={styles.tituloSecao}>Confirmando sua conta...</h2>
            <p className={styles.explicacao} aria-live="polite">
              Só um instante.
            </p>
          </>
        ) : null}

        {estado === ESTADO_CONFIRMADA ? (
          <>
            <h2 className={styles.tituloSecao}>Conta confirmada</h2>
            <p className={styles.avisoSucesso} aria-live="polite">
              <i className="bi bi-check-circle-fill" aria-hidden="true" /> Pronto! Seu e-mail foi confirmado e o acesso
              está liberado.
            </p>
            <button type="button" className={styles.submitButton} onClick={irParaLogin}>
              <i className="bi bi-arrow-right" aria-hidden="true" /> Ir para o login
            </button>
          </>
        ) : null}

        {estado === ESTADO_INVALIDO ? (
          <>
            <h2 className={styles.tituloSecao}>Não foi possível confirmar</h2>
            <p className={styles.errorMessage} aria-live="polite">
              {mensagem}
            </p>
            <p className={styles.explicacao}>
              Se você já confirmou a conta, é só entrar. Se não, tente entrar com seu e-mail e senha: a tela vai
              oferecer o envio de um novo e-mail de confirmação.
            </p>
            <p className={styles.trocaAba}>
              <button type="button" className={styles.link} onClick={irParaLogin}>
                <i className="bi bi-arrow-left" aria-hidden="true" /> Ir para o login
              </button>
            </p>
          </>
        ) : null}
      </div>
    </main>
  )
}

export default ConfirmarConta
