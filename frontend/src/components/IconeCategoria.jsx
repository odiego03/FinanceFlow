function IconeCategoria({ icone, cor, size = 34, className }) {
  return (
    <span
      className={className}
      style={{
        background: cor || '#94a3b8',
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: '#ffffff',
        fontSize: size * 0.5,
      }}
    >
      <i className={`bi bi-${icone || 'tag-fill'}`} />
    </span>
  )
}

export default IconeCategoria
