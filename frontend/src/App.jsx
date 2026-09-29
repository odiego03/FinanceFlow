import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RotaProtegida from './components/RotaProtegida'
import { useAuth } from './contexts/AuthContext'
import Categorias from './pages/Categorias'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Metas from './pages/Metas'
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
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={autenticado ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}

export default App
