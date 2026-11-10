import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import RedefinirSenha from '../components/RedefinirSenha'
import styles from './Login.module.css'

/**
 * Mesma redefinição por código do "esqueci minha senha", só que pra quem já está logado: o botão "Trocar senha"
 * de Configurações pede o código e chega aqui já na etapa de digitá-lo (location.state.codigoEnviado).
 */
function RedefinirSenhaConta() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const { state } = useLocation()
  const email = state?.email ?? usuario?.email

  // Ainda carregando o usuário (acesso direto à URL): sem o e-mail não há o que mostrar
  if (!email) {
    return null
  }

  const voltarParaConfiguracoes = (senhaAlterada) =>
    navigate('/configuracoes?aba=perfil', { replace: true, state: senhaAlterada ? { senhaAlterada: true } : null })

  return (
    <main className={styles.screen}>
      <div className={styles.card}>
        <h1 className={styles.titulo}>FinanceFlow</h1>
        <p className={styles.subtitulo}>Gestão financeira inteligente</p>
        <RedefinirSenha
          emailInicial={email}
          codigoJaEnviado={Boolean(state?.codigoEnviado)}
          rotuloVoltar="Voltar para as configurações"
          onConcluir={() => voltarParaConfiguracoes(true)}
          onVoltar={() => voltarParaConfiguracoes(false)}
        />
      </div>
    </main>
  )
}

export default RedefinirSenhaConta
