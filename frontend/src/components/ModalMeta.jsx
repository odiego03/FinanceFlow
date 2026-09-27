import { useState } from 'react'
import styles from './ModalMeta.module.css'

function ModalMeta({ metaEmEdicao, categoriasReceita, onSalvar, onCancelar }) {
  const [nome, setNome] = useState(metaEmEdicao?.nome ?? '')
  const [valorAlvo, setValorAlvo] = useState(metaEmEdicao ? String(metaEmEdicao.valorAlvo) : '')
  const [categoriaId, setCategoriaId] = useState(
    metaEmEdicao?.categoriaId ? String(metaEmEdicao.categoriaId) : '',
  )
  const [dataAlvo, setDataAlvo] = useState(metaEmEdicao?.dataAlvo ?? '')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nomeLimpo = nome.trim()
    if (!nomeLimpo) {
      setErro('Informe o nome da meta.')
      return
    }
    if (!valorAlvo || Number(valorAlvo) <= 0) {
      setErro('Informe um valor alvo válido.')
      return
    }

    setSalvando(true)
    try {
      await onSalvar({
        nome: nomeLimpo,
        valorAlvo: Number(valorAlvo),
        categoriaId: categoriaId ? Number(categoriaId) : null,
        dataAlvo: dataAlvo || null,
      })
    } catch (erroRequisicao) {
      setErro('Não foi possível salvar a meta.')
      setSalvando(false)
    }
  }

  return (
    <div className={styles.backdrop} onClick={onCancelar}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <h2>{metaEmEdicao ? 'Editar Meta' : 'Nova Meta Financeira'}</h2>

        <form onSubmit={handleSubmit}>
          <label className={styles.label} htmlFor="nomeMeta">
            Nome da meta
          </label>
          <input
            id="nomeMeta"
            type="text"
            className={styles.input}
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            placeholder="Ex: Viagem pra praia"
            maxLength={100}
          />

          <label className={styles.label} htmlFor="valorAlvoMeta">
            Valor alvo
          </label>
          <input
            id="valorAlvoMeta"
            type="number"
            step="0.01"
            min="0.01"
            className={styles.input}
            value={valorAlvo}
            onChange={(event) => setValorAlvo(event.target.value)}
          />

          <label className={styles.label} htmlFor="categoriaMeta">
            Categoria de receita vinculada (opcional)
          </label>
          <select
            id="categoriaMeta"
            className={styles.input}
            value={categoriaId}
            onChange={(event) => setCategoriaId(event.target.value)}
          >
            <option value="">Nenhuma — só aportes manuais</option>
            {categoriasReceita.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </option>
            ))}
          </select>
          <span className={styles.ajuda}>
            Receitas lançadas nessa categoria contam automaticamente pro progresso.
          </span>

          <label className={styles.label} htmlFor="dataAlvoMeta">
            Data alvo (opcional)
          </label>
          <input
            id="dataAlvoMeta"
            type="date"
            className={styles.input}
            value={dataAlvo}
            onChange={(event) => setDataAlvo(event.target.value)}
          />

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
              {metaEmEdicao ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ModalMeta
