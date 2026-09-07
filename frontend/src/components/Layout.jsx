import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import styles from './Layout.module.css'

const itensAtivos = [
  { rota: '/dashboard', rotulo: 'Dashboard' },
  { rota: '/transacoes', rotulo: 'Receitas e Despesas' },
  { rota: '/categorias', rotulo: 'Categorias' },
]

const itensEmBreve = ['Metas Financeiras', 'Relatórios', 'Simulador de Investimentos']

function Layout() {
  const { usuario, sair } = useAuth()

  return (
    <div className={styles.app}>
      <header className={styles.navbar}>
        <div className={styles.navbarGrupo}>
          <button type="button" className={styles.iconButton} aria-label="Menu">
            ☰
          </button>
          <span className={styles.marca}>FinanceFlow</span>
        </div>

        <div className={styles.navbarGrupo}>
          <span className={styles.saudacao}>Olá, {usuario?.nome?.split(' ')[0] ?? '...'}</span>
          <button type="button" className={styles.iconButton} aria-label="Ajuda" title="Ajuda">
            ?
          </button>
          <button type="button" className={styles.iconButton} aria-label="Sair" title="Sair" onClick={sair}>
            ⇥
          </button>
        </div>
      </header>

      <div className={styles.corpo}>
        <nav className={styles.sidebar}>
          {itensAtivos.map((item) => (
            <NavLink
              key={item.rota}
              to={item.rota}
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
