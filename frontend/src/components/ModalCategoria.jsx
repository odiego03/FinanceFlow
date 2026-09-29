import { useState } from 'react'
import styles from './ModalCategoria.module.css'

const ICONES_DISPONIVEIS = [
  'tag-fill',
  'cup-hot-fill',
  'cup-straw',
  'house-door-fill',
  'car-front-fill',
  'bicycle',
  'fuel-pump-fill',
  'heart-pulse-fill',
  'book-fill',
  'mortarboard-fill',
  'controller',
  'music-note-beamed',
  'receipt',
  'bag-fill',
  'cart-fill',
  'collection-play-fill',
  'airplane-fill',
  'heart-fill',
  'bank',
  'tools',
  'wifi',
  'phone-fill',
  'cash-coin',
  'wallet2',
  'piggy-bank-fill',
  'credit-card-fill',
  'graph-up-arrow',
  'briefcase-fill',
  'laptop-fill',
  'gift-fill',
  'arrow-counterclockwise',
  'cake2-fill',
  'umbrella-fill',
  'plus-circle-fill',
]
const CORES_DISPONIVEIS = [
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#16a34a',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#64748b',
]

function ModalCategoria({ categoriaEmEdicao, onSalvar, onCancelar }) {
  const [nome, setNome] = useState(categoriaEmEdicao?.nome ?? '')
  const [tipo, setTipo] = useState(categoriaEmEdicao?.tipo ?? 'RECEITA')
  const [icone, setIcone] = useState(categoriaEmEdicao?.icone ?? ICONES_DISPONIVEIS[0])
  const [cor, setCor] = useState(categoriaEmEdicao?.cor ?? CORES_DISPONIVEIS[0])
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nomeLimpo = nome.trim()
    if (!nomeLimpo) {
      setErro('Informe o nome da categoria.')
      return
    }

    setSalvando(true)
    try {
      await onSalvar({ nome: nomeLimpo, tipo, icone, cor })
    } catch (erroRequisicao) {
      setErro('Não foi possível salvar a categoria.')
      setSalvando(false)
    }
  }

  return (
    <div className={styles.backdrop} onClick={onCancelar}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <h2>{categoriaEmEdicao ? 'Editar Categoria' : 'Nova Categoria'}</h2>

        <form onSubmit={handleSubmit}>
          <label className={styles.label} htmlFor="nomeCategoria">
            Nome da Categoria
          </label>
          <input
            id="nomeCategoria"
            type="text"
            className={styles.input}
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            maxLength={50}
            autoFocus
          />
          <span className={styles.contador}>{nome.length}/50 caracteres</span>

          <span className={styles.label}>Tipo</span>
          <div className={styles.tipoGroup}>
            <button
              type="button"
              className={`${styles.tipoBotao} ${tipo === 'RECEITA' ? styles.tipoReceitaAtivo : ''}`}
              onClick={() => setTipo('RECEITA')}
            >
              Receita
            </button>
            <button
              type="button"
              className={`${styles.tipoBotao} ${tipo === 'DESPESA' ? styles.tipoDespesaAtivo : ''}`}
              onClick={() => setTipo('DESPESA')}
            >
              Despesa
            </button>
          </div>

          <span className={styles.label}>Ícone</span>
          <div className={styles.iconeGroup}>
            {ICONES_DISPONIVEIS.map((opcao) => (
              <button
                key={opcao}
                type="button"
                className={`${styles.iconeBotao} ${icone === opcao ? styles.iconeSelecionado : ''}`}
                onClick={() => setIcone(opcao)}
                aria-label={`Ícone ${opcao}`}
              >
                <i className={`bi bi-${opcao}`} />
              </button>
            ))}
          </div>

          <span className={styles.label}>Cor</span>
          <div className={styles.corGroup}>
            {CORES_DISPONIVEIS.map((opcao) => (
              <button
                key={opcao}
                type="button"
                className={`${styles.corBotao} ${cor === opcao ? styles.corSelecionada : ''}`}
                style={{ background: opcao }}
                onClick={() => setCor(opcao)}
                aria-label={`Cor ${opcao}`}
              />
            ))}
          </div>

          {erro ? (
            <p className={styles.errorMessage} aria-live="polite">
              {erro}
            </p>
          ) : null}

          <div className={styles.acoes}>
            <button type="button" className={styles.cancelar} onClick={onCancelar}>
              Cancelar
            </button>
            <button type="submit" className={styles.adicionar} disabled={salvando}>
              {categoriaEmEdicao ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ModalCategoria
