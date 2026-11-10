import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RotaProtegida from './components/RotaProtegida'
import { useAuth } from './contexts/AuthContext'
import Categorias from './pages/Categorias'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Metas from './pages/Metas'
import Configuracoes from './pages/Configuracoes'
import Relatorios from './pages/Relatorios'
import Simulacao from './pages/Simulacao'
import Transacoes from './pages/Transacoes'

function App() {
  const { autenticado } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={autenticado ? <Navigate to="/dashboard" replace /> : <Login />} />

      <Route element={<RotaProtegida />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/categorias" element={<Categorias />} />
          <Route path="/transacoes" element={<Transacoes />} />
          <Route path="/metas" element={<Metas />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/simulacao" element={<Simulacao />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          {/* Endereço antigo da tela, pra links salvos continuarem funcionando */}
          <Route path="/perfil" element={<Navigate to="/configuracoes?aba=perfil" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={autenticado ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}

export default App
