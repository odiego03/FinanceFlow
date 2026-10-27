import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePreferencias } from '../contexts/PreferenciasContext'
import Logo from './Logo'
import RodapeMercado from './RodapeMercado'
import Tutorial from './Tutorial'
import styles from './Layout.module.css'

const itensAtivos = [
  { rota: '/dashboard', rotulo: 'Dashboard', icone: 'speedometer2' },
  { rota: '/transacoes', rotulo: 'Transações', icone: 'arrow-left-right' },
  { rota: '/categorias', rotulo: 'Categorias', icone: 'tags' },
  { rota: '/metas', rotulo: 'Metas Financeiras', icone: 'bullseye' },
  { rota: '/relatorios', rotulo: 'Relatórios', icone: 'file-earmark-bar-graph' },
  { rota: '/simulacao', rotulo: 'Simulador de Investimentos', icone: 'graph-up-arrow' },
  { rota: '/configuracoes', rotulo: 'Configurações', icone: 'gear' },
]

function iniciais(nome) {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  const primeira = partes[0][0]
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return `${primeira}${ultima}`.toUpperCase()
}

function MenuUsuario() {
  const { usuario, sair } = useAuth()
  const { abrirTutorial } = usePreferencias()
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const container = useRef(null)

  // Fecha clicando fora ou com Esc
  useEffect(() => {
    if (!aberto) return undefined
    const fecharFora = (event) => {
      if (!container.current?.contains(event.target)) setAberto(false)
    }
    const fecharEsc = (event) => {
      if (event.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', fecharFora)
    document.addEventListener('keydown', fecharEsc)
    return () => {
      document.removeEventListener('mousedown', fecharFora)
      document.removeEventListener('keydown', fecharEsc)
    }
  }, [aberto])

  const ir = (rota) => {
    setAberto(false)
    navigate(rota)
  }

  const primeiroNome = usuario?.nome?.split(' ')[0] ?? '...'

  return (
    <div className={styles.usuario} ref={container}>
      <button
        type="button"
        className={styles.usuarioBotao}
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={() => setAberto((atual) => !atual)}
      >
        <span className={styles.avatar} aria-hidden="true">
          {iniciais(usuario?.nome)}
        </span>
        <span className={styles.usuarioNome}>{primeiroNome}</span>
        <i className={`bi bi-chevron-down ${styles.seta}`} aria-hidden="true" />
      </button>

      {aberto ? (
        <div className={styles.menuUsuario} role="menu">
          <div className={styles.menuCabecalho}>
            <span className={styles.avatarGrande} aria-hidden="true">
              {iniciais(usuario?.nome)}
            </span>
            <div className={styles.menuIdentidade}>
              <strong>{usuario?.nome}</strong>
              <span>{usuario?.email}</span>
            </div>
          </div>
          <button type="button" role="menuitem" onClick={() => ir('/configuracoes?aba=perfil')}>
            <i className="bi bi-person-circle" aria-hidden="true" /> Meu perfil
          </button>
          <button type="button" role="menuitem" onClick={() => ir('/configuracoes')}>
            <i className="bi bi-gear" aria-hidden="true" /> Configurações
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setAberto(false)
              abrirTutorial()
            }}
          >
            <i className="bi bi-play-circle" aria-hidden="true" /> Rever tutorial
          </button>
          <div className={styles.menuSeparador} role="separator" />
          <button type="button" role="menuitem" className={styles.menuSair} onClick={sair}>
            <i className="bi bi-box-arrow-right" aria-hidden="true" /> Sair
          </button>
        </div>
      ) : null}
    </div>
  )
}

function Layout() {
  const { preferencias, salvar, ocultarValores, alternarOcultarValores } = usePreferencias()
  const { pathname } = useLocation()
  const [sidebarAberta, setSidebarAberta] = useState(true)

  const paginaAtual = itensAtivos.find((item) => pathname.startsWith(item.rota))
  // No "Automático" o atalho considera o tema que o sistema está mostrando
  const escuro = preferencias.tema === 'ESCURO'
    || (preferencias.tema === 'SISTEMA' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  const alternarSidebar = () => setSidebarAberta((atual) => !atual)

  const fecharSidebarNoMobile = () => {
    if (window.matchMedia('(max-width: 860px)').matches) {
      setSidebarAberta(false)
    }
  }

  const alternarTema = () => {
    salvar({ ...preferencias, tema: escuro ? 'CLARO' : 'ESCURO' }).catch(() => {})
  }

  return (
    <div className={styles.app}>
      <header className={styles.navbar}>
        <div className={styles.navbarGrupo}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Alternar menu"
            aria-expanded={sidebarAberta}
            onClick={alternarSidebar}
          >
            <i className="bi bi-list" aria-hidden="true" />
          </button>
          <Link to="/dashboard" className={styles.marca} aria-label="FinanceFlow, ir para o Dashboard">
            <Logo tamanho={30} />
            <span className={styles.marcaTexto}>
              Finance<span className={styles.marcaDestaque}>Flow</span>
            </span>
          </Link>
          {paginaAtual ? (
            <span className={styles.paginaAtual}>
              <i className={`bi bi-${paginaAtual.icone}`} aria-hidden="true" /> {paginaAtual.rotulo}
            </span>
          ) : null}
        </div>

        <div className={styles.navbarGrupo}>
          <div className={styles.acoesRapidas}>
            <button
              type="button"
              className={styles.iconButton}
              aria-label={escuro ? 'Usar tema claro' : 'Usar tema escuro'}
              title={escuro ? 'Usar tema claro' : 'Usar tema escuro'}
              onClick={alternarTema}
            >
              <i className={`bi bi-${escuro ? 'sun' : 'moon-stars'}`} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`${styles.iconButton} ${ocultarValores ? styles.iconButtonAtivo : ''}`}
              aria-pressed={ocultarValores}
              aria-label={ocultarValores ? 'Mostrar valores' : 'Ocultar valores'}
              title={ocultarValores ? 'Mostrar valores' : 'Ocultar valores'}
              onClick={alternarOcultarValores}
            >
              <i className={`bi bi-${ocultarValores ? 'eye-slash' : 'eye'}`} aria-hidden="true" />
            </button>
          </div>
          <span className={styles.divisor} aria-hidden="true" />
          <MenuUsuario />
        </div>
      </header>

      <div className={styles.corpo}>
        {sidebarAberta ? (
          <button
            type="button"
            className={styles.backdrop}
            aria-label="Fechar menu"
            onClick={() => setSidebarAberta(false)}
          />
        ) : null}

        <nav className={`${styles.sidebar} ${sidebarAberta ? '' : styles.sidebarFechada}`}>
          {itensAtivos.map((item) => (
            <NavLink
              key={item.rota}
              to={item.rota}
              onClick={fecharSidebarNoMobile}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemAtivo : ''}`}
            >
              <i className={`bi bi-${item.icone}`} aria-hidden="true" /> {item.rotulo}
            </NavLink>
          ))}
        </nav>

        <main className={styles.conteudo}>
          <Outlet />
        </main>
      </div>

      <RodapeMercado />
      <Tutorial />
    </div>
  )
}

export default Layout
