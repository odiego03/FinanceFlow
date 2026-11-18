import { useState } from 'react'
import SeletorCategoria from './SeletorCategoria'
import { mensagemDeErro } from '../services/api'
import styles from './ModalMeta.module.css'

function ModalMeta({ metaEmEdicao, categoriasReceita, onSalvar, onCancelar }) {
  const [nome, setNome] = useState(metaEmEdicao?.nome ?? '')
  const [valorAlvo, setValorAlvo] = useState(metaEmEdicao ? String(metaEmEdicao.valorAlvo) : '')
  const [categoriaIds, setCategoriaIds] = useState((metaEmEdicao?.categoriaIds ?? []).map(String))
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
    if (categoriaIds.length === 0) {
      setErro('Selecione ao menos uma categoria de receita.')
      return
    }

    setSalvando(true)
    try {
      await onSalvar({
        nome: nomeLimpo,
        valorAlvo: Number(valorAlvo),
        categoriaIds: categoriaIds.map(Number),
        dataAlvo: dataAlvo || null,
      })
    } catch (erroRequisicao) {
      setErro(mensagemDeErro(erroRequisicao, 'Não foi possível salvar a meta.'))
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

          <span className={styles.label}>Categorias de receita vinculadas</span>
          <SeletorCategoria
            categorias={categoriasReceita}
            value={categoriaIds}
            onChange={setCategoriaIds}
            multiplo
          />
          <span className={styles.ajuda}>
            Escolha uma ou mais. Receitas lançadas em qualquer uma delas podem contribuir pra meta.
            {metaEmEdicao ? ' Uma categoria que já gerou contribuições não pode ser removida.' : ''}
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
