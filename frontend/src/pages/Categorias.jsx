import { useEffect, useMemo, useState } from 'react'
import ModalCategoria from '../components/ModalCategoria'
import * as categoriaService from '../services/categoriaService'
import styles from './Categorias.module.css'

function ColunaCategorias({ titulo, tipo, categorias, onEditar, onExcluir }) {
  const classeTitulo = tipo === 'RECEITA' ? styles.tituloReceita : styles.tituloDespesa
  const classeBolinha = tipo === 'RECEITA' ? styles.bolinhaReceita : styles.bolinhaDespesa

  return (
    <div className={styles.coluna}>
      <h2 className={classeTitulo}>{titulo}</h2>

      {categorias.length === 0 ? (
        <p className={styles.vazio}>Nenhuma categoria ainda.</p>
      ) : (
        categorias.map((categoria) => (
          <div key={categoria.id} className={styles.itemCategoria}>
            <span className={`${styles.bolinha} ${classeBolinha}`} />
            <span className={styles.nomeCategoria}>{categoria.nome}</span>
            <div className={styles.acoesItem}>
              <button type="button" onClick={() => onEditar(categoria)} aria-label={`Editar ${categoria.nome}`}>
                ✎
              </button>
              <button type="button" onClick={() => onExcluir(categoria)} aria-label={`Excluir ${categoria.nome}`}>
                🗑
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function Categorias() {
  const [categorias, setCategorias] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [categoriaEmEdicao, setCategoriaEmEdicao] = useState(null)

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

  const categoriasReceita = useMemo(() => categorias.filter((c) => c.tipo === 'RECEITA'), [categorias])
  const categoriasDespesa = useMemo(() => categorias.filter((c) => c.tipo === 'DESPESA'), [categorias])

  const abrirNovaCategoria = () => {
    setCategoriaEmEdicao(null)
    setModalAberto(true)
  }

  const abrirEdicao = (categoria) => {
    setCategoriaEmEdicao(categoria)
    setModalAberto(true)
  }

  const fecharModal = () => {
    setModalAberto(false)
    setCategoriaEmEdicao(null)
  }

  const handleSalvar = async ({ nome, tipo }) => {
    if (categoriaEmEdicao) {
      await categoriaService.atualizar(categoriaEmEdicao.id, { nome, tipo })
    } else {
      await categoriaService.criar({ nome, tipo })
    }
    fecharModal()
    setErro('')
    await carregarCategorias()
  }

  const handleExcluir = async (categoria) => {
    try {
      await categoriaService.excluir(categoria.id)
      await carregarCategorias()
    } catch (erroRequisicao) {
      setErro('Não foi possível excluir a categoria.')
    }
  }

  return (
    <div className={styles.pagina}>
      <div className={styles.cabecalho}>
        <h1>Gerenciar Categorias</h1>
        <button type="button" className={styles.botaoNova} onClick={abrirNovaCategoria}>
          + Nova Categoria
        </button>
      </div>

      {erro ? (
        <p className={styles.errorMessage} aria-live="polite">
          {erro}
        </p>
      ) : null}

      {carregando ? (
        <p>Carregando...</p>
      ) : (
        <div className={styles.colunas}>
          <ColunaCategorias
            titulo="Categorias de Receita"
            tipo="RECEITA"
            categorias={categoriasReceita}
            onEditar={abrirEdicao}
            onExcluir={handleExcluir}
          />
          <ColunaCategorias
            titulo="Categorias de Despesa"
            tipo="DESPESA"
            categorias={categoriasDespesa}
            onEditar={abrirEdicao}
            onExcluir={handleExcluir}
          />
        </div>
      )}

      {modalAberto ? (
        <ModalCategoria categoriaEmEdicao={categoriaEmEdicao} onSalvar={handleSalvar} onCancelar={fecharModal} />
      ) : null}
    </div>
  )
}

export default Categorias
