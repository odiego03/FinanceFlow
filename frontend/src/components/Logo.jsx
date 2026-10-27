// Marca do FinanceFlow: uma linha de gráfico subindo, em dourado, dentro de um quadrado arredondado.
// As cores vêm dos tokens do tema: quadrado preto no tema claro e branco no escuro, linha sempre dourada
function Logo({ tamanho = 32 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" style={{ fill: 'var(--marca-fundo)' }} />
      <path
        d="M8 21.5l5.5-5.5 4 4L24 13.5M19.5 13.5H24V18"
        fill="none"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ stroke: 'var(--marca-ouro)' }}
      />
    </svg>
  )
}

export default Logo
