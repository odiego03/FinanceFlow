import { useState } from 'react'
import { mensagemDeErro } from '../services/api'
import * as usuarioService from '../services/usuarioService'
import { MENSAGEM_EMAIL, MENSAGEM_SENHA, emailValido, senhaForte } from '../utils/validacao'
import RequisitosSenha from './RequisitosSenha'
import styles from '../pages/Login.module.css'

const ETAPA_EMAIL = 'email'
const ETAPA_CODIGO = 'codigo'

/**
 * "Esqueci minha senha", dentro do card do Login: 1) informa o e-mail e recebe um código de 6 números;
 * 2) digita o código e a senha nova. Ao terminar, volta pro login com o e-mail já preenchido.
 */
function RedefinirSenha({ emailInicial, onConcluir, onVoltar }) {
  const [etapa, setEtapa] = useState(ETAPA_EMAIL)
  const [email, setEmail] = useState(emailInicial)
  const [codigo, setCodigo] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [carregando, setCarregando] = useState(false)

  const pedirCodigo = async (event) => {
    event?.preventDefault()
    setErro('')
    if (!emailValido(email)) {
      setErro(MENSAGEM_EMAIL)
      return
    }
    setCarregando(true)
    try {
      await usuarioService.solicitarCodigoRedefinicao(email.trim())
      // O backend não diz se a conta existe, então o texto também não pode dizer
      setAviso(`Se ${email.trim()} tiver uma conta, um código de 6 números chega em instantes. Ele vale por 15 minutos.`)
      setEtapa(ETAPA_CODIGO)
    } catch (erroRequisicao) {
      setErro(mensagemDeErro(erroRequisicao, 'Não foi possível pedir o código. Tente de novo.'))
    } finally {
      setCarregando(false)
    }
  }

  const redefinir = async (event) => {
    event.preventDefault()
    setErro('')
    if (!/^\d{6}$/.test(codigo)) {
      setErro('O código tem 6 números.')
      return
    }
    if (!senhaForte(novaSenha)) {
      setErro(MENSAGEM_SENHA)
      return
    }
    if (novaSenha !== confirmacao) {
      setErro('A confirmação não bate com a nova senha.')
      return
    }
    setCarregando(true)
    try {
      await usuarioService.redefinirSenha(email.trim(), codigo, novaSenha)
      onConcluir(email.trim())
    } catch (erroRequisicao) {
      setErro(mensagemDeErro(erroRequisicao, 'Não foi possível redefinir a senha.'))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <>
      <h2 className={styles.tituloSecao}>Redefinir senha</h2>

      {etapa === ETAPA_EMAIL ? (
        <form className={styles.form} onSubmit={pedirCodigo}>
          <p className={styles.explicacao}>Informe o e-mail da sua conta. Vamos mandar um código para criar uma senha nova.</p>
          <label className={styles.label} htmlFor="email-redefinicao">
            E-mail
          </label>
          <input
            id="email-redefinicao"
            type="email"
            className={styles.input}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
          {erro ? (
            <p className={styles.errorMessage} aria-live="polite">
              {erro}
            </p>
          ) : null}
          <button type="submit" className={styles.submitButton} disabled={carregando}>
            <i className="bi bi-envelope" aria-hidden="true" /> {carregando ? 'Enviando...' : 'Enviar código'}
          </button>
        </form>
      ) : (
        <form className={styles.form} onSubmit={redefinir}>
          <p className={styles.avisoSucesso} aria-live="polite">
            <i className="bi bi-envelope-check" aria-hidden="true" /> {aviso}
          </p>
          <label className={styles.label} htmlFor="codigo-redefinicao">
            Código recebido
          </label>
          <input
            id="codigo-redefinicao"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className={`${styles.input} ${styles.inputCodigo}`}
            value={codigo}
            onChange={(event) => setCodigo(event.target.value.replace(/\D/g, ''))}
            required
          />
          <label className={styles.label} htmlFor="nova-senha-redefinicao">
            Nova senha
          </label>
          <input
            id="nova-senha-redefinicao"
            type="password"
            autoComplete="new-password"
            className={styles.input}
            value={novaSenha}
            onChange={(event) => setNovaSenha(event.target.value)}
            aria-describedby="requisitos-redefinicao"
            required
          />
          <RequisitosSenha senha={novaSenha} id="requisitos-redefinicao" />
          <label className={styles.label} htmlFor="confirmacao-redefinicao">
            Confirme a nova senha
          </label>
          <input
            id="confirmacao-redefinicao"
            type="password"
            autoComplete="new-password"
            className={styles.input}
            value={confirmacao}
            onChange={(event) => setConfirmacao(event.target.value)}
            required
          />
          {erro ? (
            <p className={styles.errorMessage} aria-live="polite">
              {erro}
            </p>
          ) : null}
          <button type="submit" className={styles.submitButton} disabled={carregando}>
            <i className="bi bi-shield-lock" aria-hidden="true" /> {carregando ? 'Salvando...' : 'Salvar nova senha'}
          </button>
          <p className={styles.trocaAba}>
            Não chegou?{' '}
            <button type="button" className={styles.link} onClick={pedirCodigo} disabled={carregando}>
              Mandar outro código
            </button>{' '}
            (espere 1 minuto e confira o spam)
          </p>
        </form>
      )}

      <p className={styles.trocaAba}>
        <button type="button" className={styles.link} onClick={onVoltar}>
          <i className="bi bi-arrow-left" aria-hidden="true" /> Voltar para o login
        </button>
      </p>
    </>
  )
}

export default RedefinirSenha
