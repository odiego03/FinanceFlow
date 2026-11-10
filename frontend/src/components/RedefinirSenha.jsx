import { useState } from 'react'
import { mensagemDeErro } from '../services/api'
import * as usuarioService from '../services/usuarioService'
import { formatarContagem, useEsperaReenvio } from '../utils/useEsperaReenvio'
import { MENSAGEM_EMAIL, MENSAGEM_SENHA, emailValido, senhaForte } from '../utils/validacao'
import RequisitosSenha from './RequisitosSenha'
import styles from '../pages/Login.module.css'

const ETAPA_EMAIL = 'email'
const ETAPA_CODIGO = 'codigo'
const ETAPA_NOVA_SENHA = 'novaSenha'

// O backend não diz se a conta existe, então o texto também não pode dizer
function avisoDoCodigo(email) {
  return `Se ${email} tiver uma conta, um código de 6 números chega em instantes. Ele vale por 15 minutos.`
}

/**
 * Redefinição de senha por código enviado ao e-mail, em 3 etapas:
 * 1) e-mail; 2) só o código (conferido no backend); 3) senha nova. Ao terminar chama onConcluir.
 * Com `codigoJaEnviado` (quem já pediu o código em outra tela, como Configurações) começa direto na etapa 2.
 */
function RedefinirSenha({ emailInicial, codigoJaEnviado = false, rotuloVoltar = 'Voltar para o login', onConcluir, onVoltar }) {
  const [etapa, setEtapa] = useState(codigoJaEnviado ? ETAPA_CODIGO : ETAPA_EMAIL)
  const [email, setEmail] = useState(emailInicial)
  const [codigo, setCodigo] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState(codigoJaEnviado ? avisoDoCodigo(emailInicial) : '')
  const [carregando, setCarregando] = useState(false)
  // Reenviar fica desabilitado por 1 minuto a cada envio; o primeiro envio também conta, pois o backend ignora
  // pedidos feitos menos de 1 minuto depois do anterior
  const { segundos: segundosParaReenviar, iniciar: iniciarEsperaDoReenvio } = useEsperaReenvio(codigoJaEnviado)

  const pedirCodigo = async (event) => {
    event.preventDefault()
    setErro('')
    if (!emailValido(email)) {
      setErro(MENSAGEM_EMAIL)
      return
    }
    setCarregando(true)
    try {
      await usuarioService.solicitarCodigoRedefinicao(email.trim())
      setAviso(avisoDoCodigo(email.trim()))
      iniciarEsperaDoReenvio()
      setEtapa(ETAPA_CODIGO)
    } catch (erroRequisicao) {
      setErro(mensagemDeErro(erroRequisicao, 'Não foi possível pedir o código. Tente de novo.'))
    } finally {
      setCarregando(false)
    }
  }

  const reenviarCodigo = async () => {
    if (segundosParaReenviar > 0 || carregando) {
      return
    }
    setErro('')
    setCarregando(true)
    try {
      await usuarioService.solicitarCodigoRedefinicao(email.trim())
      setAviso(`Se ${email.trim()} tiver uma conta, um novo código chega em instantes. O anterior deixou de valer.`)
      setCodigo('')
      // Só começa a contar se o pedido deu certo: se falhou, dá pra tentar de novo na hora
      iniciarEsperaDoReenvio()
    } catch (erroRequisicao) {
      setErro(mensagemDeErro(erroRequisicao, 'Não foi possível reenviar o código. Tente de novo.'))
    } finally {
      setCarregando(false)
    }
  }

  const confirmarCodigo = async (event) => {
    event.preventDefault()
    setErro('')
    if (!/^\d{6}$/.test(codigo)) {
      setErro('O código tem 6 números.')
      return
    }
    setCarregando(true)
    try {
      await usuarioService.verificarCodigoRedefinicao(email.trim(), codigo)
      setEtapa(ETAPA_NOVA_SENHA)
    } catch (erroRequisicao) {
      setErro(mensagemDeErro(erroRequisicao, 'Não foi possível conferir o código. Tente de novo.'))
    } finally {
      setCarregando(false)
    }
  }

  const redefinir = async (event) => {
    event.preventDefault()
    setErro('')
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
      const mensagem = mensagemDeErro(erroRequisicao, 'Não foi possível redefinir a senha.')
      if (/código/i.test(mensagem)) {
        // O código expirou (ou foi substituído) entre a conferência e agora: volta pra etapa do código
        setCodigo('')
        setEtapa(ETAPA_CODIGO)
      }
      setErro(mensagem)
    } finally {
      setCarregando(false)
    }
  }

  const erroNaTela = erro ? (
    <p className={styles.errorMessage} aria-live="polite">
      {erro}
    </p>
  ) : null

  return (
    <>
      <h2 className={styles.tituloSecao}>{etapa === ETAPA_NOVA_SENHA ? 'Nova senha' : 'Redefinir senha'}</h2>

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
          {erroNaTela}
          <button type="submit" className={styles.submitButton} disabled={carregando}>
            <i className="bi bi-envelope" aria-hidden="true" /> {carregando ? 'Enviando...' : 'Enviar código'}
          </button>
        </form>
      ) : null}

      {etapa === ETAPA_CODIGO ? (
        <form className={styles.form} onSubmit={confirmarCodigo}>
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
          {erroNaTela}
          <button type="submit" className={styles.submitButton} disabled={carregando}>
            <i className="bi bi-check2-circle" aria-hidden="true" /> {carregando ? 'Conferindo...' : 'Confirmar código'}
          </button>
          <p className={styles.trocaAba}>
            Não chegou?{' '}
            <button
              type="button"
              className={styles.link}
              onClick={reenviarCodigo}
              disabled={carregando || segundosParaReenviar > 0}
            >
              Reenviar código{segundosParaReenviar > 0 ? ` (${formatarContagem(segundosParaReenviar)})` : ''}
            </button>
            <br />
            Confira também a caixa de spam.
          </p>
        </form>
      ) : null}

      {etapa === ETAPA_NOVA_SENHA ? (
        <form className={styles.form} onSubmit={redefinir}>
          <p className={styles.avisoSucesso} aria-live="polite">
            <i className="bi bi-check-circle-fill" aria-hidden="true" /> Código confirmado. Escolha a nova senha.
          </p>
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
          {erroNaTela}
          <button type="submit" className={styles.submitButton} disabled={carregando}>
            <i className="bi bi-shield-lock" aria-hidden="true" /> {carregando ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>
      ) : null}

      <p className={styles.trocaAba}>
        <button type="button" className={styles.link} onClick={onVoltar}>
          <i className="bi bi-arrow-left" aria-hidden="true" /> {rotuloVoltar}
        </button>
      </p>
    </>
  )
}

export default RedefinirSenha
