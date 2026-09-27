import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import styles from './Layout.module.css'

const itensAtivos = [
  { rota: '/dashboard', rotulo: 'Dashboard' },
  { rota: '/transacoes', rotulo: 'Transações' },
  { rota: '/categorias', rotulo: 'Categorias' },
  { rota: '/metas', rotulo: 'Metas Financeiras' },
]

const itensEmBreve = ['Relatórios', 'Simulador de Investimentos']

function Layout() {
  const { usuario, sair } = useAuth()
  const [sidebarAberta, setSidebarAberta] = useState(true)

  const alternarSidebar = () => setSidebarAberta((atual) => !atual)

  const fecharSidebarNoMobile = () => {
    if (window.matchMedia('(max-width: 860px)').matches) {
      setSidebarAberta(false)
    }
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
            ☰
          </button>
          <span className={styles.marca}>FinanceFlow</span>
        </div>

        <div className={styles.navbarGrupo}>
          <span className={styles.saudacao}>Olá, {usuario?.nome?.split(' ')[0] ?? '...'}</span>
          <button type="button" className={styles.iconButton} aria-label="Sair" title="Sair" onClick={sair}>
            ⇥
          </button>
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
              {item.rotulo}
            </NavLink>
          ))}

          {itensEmBreve.map((rotulo) => (
            <span key={rotulo} className={styles.navItemDesabilitado} title="Em breve">
              {rotulo}
            </span>
          ))}
        </nav>

        <main className={styles.conteudo}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
