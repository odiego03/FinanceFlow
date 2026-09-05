import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import * as categoriaService from '../services/categoriaService'
import styles from './Categorias.module.css'

const tipoTexto = {
  DESPESA: 'Despesa',
  RECEITA: 'Receita',
}

function Categorias() {
  const { sair } = useAuth()
  const [tipoSelecionado, setTipoSelecionado] = useState('DESPESA')
  const [nomeCategoria, setNomeCategoria] = useState('')
  const [categoriaEmEdicao, setCategoriaEmEdicao] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const carregarCategorias = async () => {
    try {
      const dados = await categoriaService.listar()
      setCategorias(dados)
    } catch (erroRequisicao) {
      setErro('Não foi possível carregar as categorias.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarCategorias()
  }, [])

  const categoriasAtuais = useMemo(
    () => categorias.filter((categoria) => categoria.tipo === tipoSelecionado),
    [categorias, tipoSelecionado],
  )

  const limparFormulario = () => {
    setNomeCategoria('')
    setCategoriaEmEdicao(null)
  }

  const handleSalvar = async (event) => {
    event.preventDefault()

    const nomeLimpo = nomeCategoria.trim()
    if (!nomeLimpo) {
      setErro('Informe o nome da categoria.')
      setSucesso('')
      return
    }

    try {
      if (categoriaEmEdicao) {
        await categoriaService.atualizar(categoriaEmEdicao.id, { nome: nomeLimpo, tipo: tipoSelecionado })
        setSucesso(`Categoria "${nomeLimpo}" atualizada.`)
      } else {
        await categoriaService.criar({ nome: nomeLimpo, tipo: tipoSelecionado })
        setSucesso(`Categoria "${nomeLimpo}" adicionada.`)
      }
      limparFormulario()
      setErro('')
      await carregarCategorias()
    } catch (erroRequisicao) {
      setErro('Não foi possível salvar a categoria.')
      setSucesso('')
    }
  }

  const handleEditar = (categoria) => {
    setCategoriaEmEdicao(categoria)
    setNomeCategoria(categoria.nome)
    setTipoSelecionado(categoria.tipo)
    setErro('')
    setSucesso('')
  }

  const handleExcluir = async (categoria) => {
    try {
      await categoriaService.excluir(categoria.id)
      if (categoriaEmEdicao?.id === categoria.id) {
        limparFormulario()
      }
      await carregarCategorias()
    } catch (erroRequisicao) {
      setErro('Não foi possível excluir a categoria.')
    }
  }

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <h1>Categorias</h1>
        <button type="button" className={styles.logoutButton} onClick={sair}>
          Sair
        </button>
      </header>

      <form className={styles.form} onSubmit={handleSalvar}>
        <div className={styles.toggleGroup} role="tablist" aria-label="Tipo da categoria">
          {Object.entries(tipoTexto).map(([tipo, texto]) => (
            <button
              key={tipo}
              type="button"
              role="tab"
              aria-selected={tipoSelecionado === tipo}
              className={`${styles.toggle} ${tipoSelecionado === tipo ? styles.toggleActive : ''}`}
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

        {carregando ? (
          <p>Carregando...</p>
        ) : (
          <div className={styles.categoryList}>
            {categoriasAtuais.map((categoria) => (
              <div key={categoria.id} className={styles.categoryChip}>
                <span>{categoria.nome}</span>
                <div className={styles.categoryActions}>
                  <button type="button" onClick={() => handleEditar(categoria)} aria-label={`Editar ${categoria.nome}`}>
                    ✎
                  </button>
                  <button type="button" onClick={() => handleExcluir(categoria)} aria-label={`Excluir ${categoria.nome}`}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

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
          {categoriaEmEdicao ? '✓ Atualizar categoria' : '✓ Salvar categoria'}
        </button>

        {categoriaEmEdicao ? (
          <button type="button" className={styles.cancelButton} onClick={limparFormulario}>
            Cancelar edição
          </button>
        ) : null}
      </form>
    </main>
  )
}

export default Categorias
