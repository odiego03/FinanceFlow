import { useMemo, useState } from 'react'
import styles from './Categorias.module.css'

const categoriasIniciais = [
  { id: 1, nome: 'Alimentação', tipo: 'DESPESA' },
  { id: 2, nome: 'Moradia', tipo: 'DESPESA' },
  { id: 3, nome: 'Salário', tipo: 'RECEITA' },
  { id: 4, nome: 'Transporte', tipo: 'DESPESA' },
]

const tipoTexto = {
  DESPESA: 'Despesa',
  RECEITA: 'Receita',
}

const normalizarNome = (valor) =>
  valor
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

function Categorias() {
  const [tipoSelecionado, setTipoSelecionado] = useState('DESPESA')
  const [nomeCategoria, setNomeCategoria] = useState('')
  const [categorias, setCategorias] = useState(categoriasIniciais)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const categoriasAtuais = useMemo(
    () => categorias.filter((categoria) => categoria.tipo === tipoSelecionado),
    [categorias, tipoSelecionado],
  )

  const handleSalvar = (event) => {
    event.preventDefault()

    const nomeLimpo = nomeCategoria.trim()

    if (!nomeLimpo) {
      setErro('Informe o nome da categoria.')
      setSucesso('')
      return
    }

    const jaExiste = categorias.some(
      (categoria) => normalizarNome(categoria.nome) === normalizarNome(nomeLimpo),
    )

    if (jaExiste) {
      setErro('Essa categoria já existe.')
      setSucesso('')
      return
    }

    const novaCategoria = {
      id: Date.now(),
      nome: nomeLimpo,
      tipo: tipoSelecionado,
    }

    setCategorias((categoriasAtuais) => [novaCategoria, ...categoriasAtuais])
    setNomeCategoria('')
    setErro('')
    setSucesso(`Categoria "${nomeLimpo}" adicionada com sucesso.`)
  }

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <button type="button" className={styles.backButton} aria-label="Voltar">
          ←
        </button>
        <h1>Categorias</h1>
      </header>

      <form className={styles.form} onSubmit={handleSalvar}>
        <div className={styles.toggleGroup} role="tablist" aria-label="Tipo da categoria">
          {Object.entries(tipoTexto).map(([tipo, texto]) => (
            <button
              key={tipo}
              type="button"
              role="tab"
              aria-selected={tipoSelecionado === tipo}
              className={`${styles.toggle} ${
                tipoSelecionado === tipo ? styles.toggleActive : ''
              }`}
              onClick={() => {
                setTipoSelecionado(tipo)
                setErro('')
                setSucesso('')
              }}
            >
              {texto}
            </button>
          ))}
        </div>

        <label className={styles.label} htmlFor="nomeCategoria">
          Nome da categoria
        </label>
        <input
          id="nomeCategoria"
          type="text"
          className={styles.input}
          value={nomeCategoria}
          onChange={(event) => {
            setNomeCategoria(event.target.value)
            setErro('')
            setSucesso('')
          }}
          placeholder="Ex: Supermercado"
          maxLength={30}
        />

        <div className={styles.listHeader}>
          <span>Categorias</span>
          <span>{categoriasAtuais.length}</span>
        </div>

        <div className={styles.categoryList}>
          {categoriasAtuais.map((categoria) => (
            <div key={categoria.id} className={styles.categoryChip}>
              {categoria.nome}
            </div>
          ))}
        </div>

        {erro ? (
          <p className={styles.errorMessage} aria-live="polite">
            {erro}
          </p>
        ) : null}

        {sucesso ? (
          <p className={styles.successMessage} aria-live="polite">
            {sucesso}
          </p>
        ) : null}

        <button type="submit" className={styles.submitButton}>
          ✓ Salvar categoria
        </button>
      </form>
    </main>
  )
}

export default Categorias
