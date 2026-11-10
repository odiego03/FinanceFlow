import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'
import { PreferenciasProvider } from './contexts/PreferenciasContext'
import { aplicarTema, temaSalvoNoNavegador } from './utils/tema'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './index.css'

aplicarTema(temaSalvoNoNavegador())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PreferenciasProvider>
          <App />
        </PreferenciasProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
