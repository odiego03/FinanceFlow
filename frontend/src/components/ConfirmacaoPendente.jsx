import { useState } from 'react'
import { mensagemDeErro } from '../services/api'
import * as usuarioService from '../services/usuarioService'
import { formatarContagem, useEsperaReenvio } from '../utils/useEsperaReenvio'
import styles from '../pages/Login.module.css'

/**
 * Painel "confirme seu e-mail", dentro do cartão do Login. Aparece em dois casos:
 * - logo depois do cadastro (`recemCadastrado`): o e-mail de confirmação acabou de sair, então o botão de reenviar
 *   já começa em espera;
 * - quando o login é recusado porque a conta ainda não foi confirmada: não sabemos quando saiu o último e-mail,
 *   então dá pra pedir outro na hora (o backend ignora pedidos com menos de 1 minuto do anterior).
 */
function ConfirmacaoPendente({ email, recemCadastrado, onVoltar }) {
  const [aviso, setAviso] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const { segundos, iniciar } = useEsperaReenvio(recemCadastrado)

  const reenviar = async () => {
    if (segundos > 0 || enviando) {
      return
    }
    setErro('')
    setAviso('')
    setEnviando(true)
    try {
      await usuarioService.reenviarConfirmacao(email)
      // O backend não diz se a conta existe nem se já foi confirmada, então o texto também não pode dizer
      setAviso(`Se ${email} ainda não estiver confirmado, um novo e-mail de confirmação chega em instantes.`)
      // Só começa a contar se o pedido deu certo: se falhou, dá pra tentar de novo na hora
      iniciar()
    } catch (erroRequisicao) {
      setErro(mensagemDeErro(erroRequisicao, 'Não foi possível reenviar o e-mail. Tente de novo.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <h2 className={styles.tituloSecao}>{recemCadastrado ? 'Confirme seu e-mail' : 'Conta ainda não confirmada'}</h2>

      {recemCadastrado ? (
        <p className={styles.avisoSucesso} aria-live="polite">
          <i className="bi bi-envelope-check" aria-hidden="true" /> Conta criada! Enviamos um e-mail para {email}. Clique
          em &quot;Confirmar conta&quot; nele para liberar o acesso.
        </p>
      ) : (
        <p className={styles.explicacao}>
          O e-mail {email} ainda não foi confirmado. Abra o e-mail de confirmação que enviamos e clique em
          &quot;Confirmar conta&quot; para entrar.
        </p>
      )}
      <p className={styles.explicacao}>O link vale por 24 horas. Confira também a caixa de spam.</p>

      {aviso ? (
        <p className={styles.avisoSucesso} aria-live="polite">
          <i className="bi bi-envelope-check" aria-hidden="true" /> {aviso}
        </p>
      ) : null}
      {erro ? (
        <p className={styles.errorMessage} aria-live="polite">
          {erro}
        </p>
      ) : null}

      <p className={styles.trocaAba}>
        Não recebeu?{' '}
        <button type="button" className={styles.link} onClick={reenviar} disabled={enviando || segundos > 0}>
          Reenviar e-mail de confirmação{segundos > 0 ? ` (${formatarContagem(segundos)})` : ''}
        </button>
      </p>

      <p className={styles.trocaAba}>
        <button type="button" className={styles.link} onClick={onVoltar}>
          <i className="bi bi-arrow-left" aria-hidden="true" /> Voltar para o login
        </button>
      </p>
    </>
  )
}

export default ConfirmacaoPendente
