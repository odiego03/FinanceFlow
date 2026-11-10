// O tema vale na conta (preferências no backend), mas o último usado fica no navegador pra ser aplicado
// antes do React montar — sem isso a tela piscaria clara até as preferências chegarem, e o login ficaria claro
const CHAVE_TEMA = 'financeflow.tema'

export function temaSalvoNoNavegador() {
  try {
    return localStorage.getItem(CHAVE_TEMA) || 'CLARO'
  } catch {
    return 'CLARO'
  }
}

export function aplicarTema(tema) {
  const escuro = tema === 'ESCURO'
    || (tema === 'SISTEMA' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.tema = escuro ? 'escuro' : 'claro'
  try {
    localStorage.setItem(CHAVE_TEMA, tema)
  } catch {
    // sem localStorage o tema só não sobrevive ao recarregar antes do login
  }
}
