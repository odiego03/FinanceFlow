import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePreferencias } from '../contexts/PreferenciasContext'
import styles from './Tutorial.module.css'

const passos = [
  {
    icone: 'stars',
    titulo: 'Bem-vindo ao FinanceFlow',
    texto:
      'Aqui você organiza receitas e despesas, acompanha quanto da sua renda está comprometida e guarda dinheiro para as suas metas. Este tour leva menos de um minuto.',
  },
  {
    icone: 'tags-fill',
    titulo: 'Categorias',
    onde: 'Categorias',
    texto:
      'Sua conta já vem com as categorias mais comuns (Salário, Alimentação, Moradia...). Crie as suas, escolha ícone e cor, e marque quais despesas são essenciais: é isso que alimenta o alerta de comprometimento de renda.',
  },
  {
    icone: 'arrow-left-right',
    titulo: 'Transações',
    onde: 'Transações',
    texto:
      'Lance cada receita e despesa com valor, data e categoria. Compras parceladas viram parcelas mensais automaticamente. Tem extrato do Nubank ou do Itaú em CSV? Importe: o sistema sugere as categorias e aprende com as suas escolhas.',
  },
  {
    icone: 'speedometer2',
    titulo: 'Dashboard',
    onde: 'Dashboard',
    texto:
      'O resumo do mês: saldo, gráficos por categoria e a evolução dos últimos meses. O indicador segue a regra 50/30/20 e avisa quando as despesas passam do saudável, com sugestões do que ajustar.',
  },
  {
    icone: 'bullseye',
    titulo: 'Metas Financeiras',
    onde: 'Metas Financeiras',
    texto:
      'Crie uma meta (uma viagem, uma reserva de emergência) ligada a uma categoria de receita. Quando entrar uma receita nessa categoria, você escolhe quanto dela vai para a meta e acompanha o progresso.',
  },
  {
    icone: 'graph-up-arrow',
    titulo: 'Relatórios e Simulador',
    onde: 'Relatórios · Simulador de Investimentos',
    texto:
      'Compare o mês ou o ano com o período anterior e exporte em CSV ou PDF. No simulador, veja quanto um valor renderia na poupança, num CDB ou no Tesouro Selic, com as taxas atuais do Banco Central.',
  },
  {
    icone: 'gear-fill',
    titulo: 'Configurações',
    onde: 'Configurações',
    texto:
      'Tema escuro, seus limites de alerta, padrões do simulador, exportação dos seus dados e a troca de senha ficam lá. O olho na barra de cima esconde os valores em R$ quando alguém estiver olhando. Dá pra rever este tutorial em Configurações → Ajuda.',
  },
]

function Tutorial() {
  const { usuario } = useAuth()
  const { tutorialAberto, fecharTutorial } = usePreferencias()
  const [indice, setIndice] = useState(0)
  const dialogo = useRef(null)

  // Volta pro primeiro passo ao fechar, pra quem reabrir em Configurações começar do início
  const fechar = useCallback(() => {
    setIndice(0)
    fecharTutorial()
  }, [fecharTutorial])

  useEffect(() => {
    if (!tutorialAberto) return undefined
    dialogo.current?.focus()
    const fecharNoEsc = (event) => {
      if (event.key === 'Escape') fechar()
    }
    window.addEventListener('keydown', fecharNoEsc)
    return () => window.removeEventListener('keydown', fecharNoEsc)
  }, [tutorialAberto, fechar])

  if (!tutorialAberto) return null

  const passo = passos[indice]
  const primeiro = indice === 0
  const ultimo = indice === passos.length - 1
  const primeiroNome = usuario?.nome?.split(' ')[0]

  return (
    <div className={styles.backdrop}>
      <div
        ref={dialogo}
        className={styles.cartao}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-titulo"
        tabIndex={-1}
      >
        <button type="button" className={styles.pular} onClick={fechar}>
          Pular tutorial
        </button>

        <div className={styles.icone} aria-hidden="true">
          <i className={`bi bi-${passo.icone}`} />
        </div>
        <p className={styles.contador}>
          Passo {indice + 1} de {passos.length}
        </p>
        <h2 id="tutorial-titulo" className={styles.titulo}>
          {primeiro && primeiroNome ? `Bem-vindo ao FinanceFlow, ${primeiroNome}!` : passo.titulo}
        </h2>
        <p className={styles.texto}>{passo.texto}</p>
        {passo.onde ? (
          <p className={styles.onde}>
            <i className="bi bi-list" aria-hidden="true" /> No menu: <strong>{passo.onde}</strong>
          </p>
        ) : null}

        <div className={styles.pontos} aria-hidden="true">
          {passos.map((item, posicao) => (
            <span key={item.titulo} className={posicao === indice ? styles.pontoAtivo : styles.ponto} />
          ))}
        </div>

        <div className={styles.acoes}>
          {!primeiro ? (
            <button type="button" className={styles.voltar} onClick={() => setIndice((atual) => atual - 1)}>
              Voltar
            </button>
          ) : null}
          <button
            type="button"
            className={styles.avancar}
            onClick={() => (ultimo ? fechar() : setIndice((atual) => atual + 1))}
          >
            {ultimo ? 'Começar a usar' : primeiro ? 'Vamos lá' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Tutorial
