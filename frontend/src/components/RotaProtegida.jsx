import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function RotaProtegida() {
  const { autenticado } = useAuth()
  return autenticado ? <Outlet /> : <Navigate to="/login" replace />
}

export default RotaProtegida
