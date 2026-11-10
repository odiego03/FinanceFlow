import { useEffect, useMemo, useState } from 'react'
import { Carregando, Esqueleto } from '../components/Esqueleto'
import IconeCategoria from '../components/IconeCategoria'
import ModalCategoria from '../components/ModalCategoria'
import ModalConfirmacao from '../components/ModalConfirmacao'
import { mensagemDeErro } from '../services/api'
import * as categoriaService from '../services/categoriaService'
import styles from './Categorias.module.css'

function ColunaCategorias({ titulo, tipo, categorias, onEditar, onExcluir }) {
  const classeTitulo = tipo === 'RECEITA' ? styles.tituloReceita : styles.tituloDespesa

  return (
    <div className={styles.coluna}>
      <h2 className={classeTitulo}>{titulo}</h2>

      {categorias.length === 0 ? (
        <p className={styles.vazio}>Nenhuma categoria ainda.</p>
      ) : (
        categorias.map((categoria) => (
          <div key={categoria.id} className={styles.itemCategoria}>
            <IconeCategoria icone={categoria.icone} cor={categoria.cor} size={28} />
            <span className={styles.nomeCategoria}>{categoria.nome}</span>
            {categoria.essencial ? (
              <span className={styles.badgeEssencial} title="Conta no limite de 50% do indicador de comprometimento">
                Essencial
              </span>
            ) : null}
            <div className={styles.acoesItem}>
              <button type="button" onClick={() => onEditar(categoria)} aria-label={`Editar ${categoria.nome}`}>
                <i className="bi bi-pencil" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => onExcluir(categoria)} aria-label={`Excluir ${categoria.nome}`}>
                <i className="bi bi-trash3" aria-hidden="true" />
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
  const [categoriaParaExcluir, setCategoriaParaExcluir] = useState(null)

  const carregarCategorias = async () => {
    try {
      const dados = await categoriaService.listar()
      setCategorias(dados)
    } catch {
      setErro('Não foi possível carregar as categorias.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    const carregarComPredefinidas = async () => {
      try {
        await categoriaService.adicionarPredefinidas()
      } catch {
        // usuário mantém só as categorias que já tinha se essa chamada falhar
      }
      await carregarCategorias()
    }
    carregarComPredefinidas()
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

  const handleSalvar = async ({ nome, tipo, icone, cor }) => {
    if (categoriaEmEdicao) {
      await categoriaService.atualizar(categoriaEmEdicao.id, { nome, tipo, icone, cor })
    } else {
      await categoriaService.criar({ nome, tipo, icone, cor })
    }
    fecharModal()
    setErro('')
    await carregarCategorias()
  }

  const confirmarExclusao = async () => {
    try {
      await categoriaService.excluir(categoriaParaExcluir.id)
      await carregarCategorias()
      setCategoriaParaExcluir(null)
    } catch (erroRequisicao) {
      setErro(mensagemDeErro(erroRequisicao, 'Não foi possível excluir a categoria.'))
      setCategoriaParaExcluir(null)
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
        <Carregando rotulo="Carregando categorias" className={styles.colunas}>
          {['Categorias de Receita', 'Categorias de Despesa'].map((titulo, coluna) => (
            <div key={titulo} className={styles.coluna}>
              <h2 className={coluna === 0 ? styles.tituloReceita : styles.tituloDespesa}>{titulo}</h2>
              {[55, 40, 62, 48, 35].map((largura) => (
                <div key={largura} className={styles.itemCategoria}>
                  <Esqueleto circulo altura={28} />
                  <Esqueleto largura={`${largura}%`} />
                </div>
              ))}
            </div>
          ))}
        </Carregando>
      ) : (
        <div className={styles.colunas}>
          <ColunaCategorias
            titulo="Categorias de Receita"
            tipo="RECEITA"
            categorias={categoriasReceita}
            onEditar={abrirEdicao}
            onExcluir={setCategoriaParaExcluir}
          />
          <ColunaCategorias
            titulo="Categorias de Despesa"
            tipo="DESPESA"
            categorias={categoriasDespesa}
            onEditar={abrirEdicao}
            onExcluir={setCategoriaParaExcluir}
          />
        </div>
      )}

      {modalAberto ? (
        <ModalCategoria categoriaEmEdicao={categoriaEmEdicao} onSalvar={handleSalvar} onCancelar={fecharModal} />
      ) : null}

      {categoriaParaExcluir ? (
        <ModalConfirmacao
          titulo="Excluir categoria"
          mensagem={`Tem certeza que deseja excluir "${categoriaParaExcluir.nome}"? Essa ação não pode ser desfeita.`}
          onConfirmar={confirmarExclusao}
          onCancelar={() => setCategoriaParaExcluir(null)}
        />
      ) : null}
    </div>
  )
}

export default Categorias
