import { Navigate, Route, Routes } from 'react-router-dom'
import RotaProtegida from './components/RotaProtegida'
import { useAuth } from './contexts/AuthContext'
import Categorias from './pages/Categorias'
import Login from './pages/Login'

function App() {
  const { autenticado } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={autenticado ? <Navigate to="/categorias" replace /> : <Login />} />

      <Route element={<RotaProtegida />}>
        <Route path="/categorias" element={<Categorias />} />
      </Route>

      <Route path="*" element={<Navigate to={autenticado ? '/categorias' : '/login'} replace />} />
    </Routes>
  )
}

export default App
