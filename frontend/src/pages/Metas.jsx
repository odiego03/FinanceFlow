import { useEffect, useMemo, useState } from 'react'
import ModalAporte from '../components/ModalAporte'
import ModalConfirmacao from '../components/ModalConfirmacao'
import ModalMeta from '../components/ModalMeta'
import * as categoriaService from '../services/categoriaService'
import * as metaService from '../services/metaService'
import styles from './Metas.module.css'

const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const formatadorData = new Intl.DateTimeFormat('pt-BR')

function Metas() {
  const [metas, setMetas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [modalMetaAberto, setModalMetaAberto] = useState(false)
  const [metaEmEdicao, setMetaEmEdicao] = useState(null)
  const [metaParaAporte, setMetaParaAporte] = useState(null)
  const [metaParaExcluir, setMetaParaExcluir] = useState(null)
  const [aporteParaExcluir, setAporteParaExcluir] = useState(null)

  const carregarDados = async () => {
    try {
      const [dadosMetas, dadosCategorias] = await Promise.all([
        metaService.listar(),
        categoriaService.listar(),
      ])
      setMetas(dadosMetas)
      setCategorias(dadosCategorias)
    } catch (erroRequisicao) {
      setErro('Não foi possível carregar as metas.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const categoriasReceita = useMemo(() => categorias.filter((c) => c.tipo === 'RECEITA'), [categorias])

  const abrirNovaMeta = () => {
    setMetaEmEdicao(null)
    setModalMetaAberto(true)
  }

  const abrirEdicao = (meta) => {
    setMetaEmEdicao(meta)
    setModalMetaAberto(true)
  }

  const fecharModalMeta = () => {
    setModalMetaAberto(false)
    setMetaEmEdicao(null)
  }

  const handleSalvarMeta = async (dto) => {
    if (metaEmEdicao) {
      await metaService.atualizar(metaEmEdicao.id, dto)
    } else {
      await metaService.criar(dto)
    }
    fecharModalMeta()
    setErro('')
    await carregarDados()
  }

  const confirmarExclusaoMeta = async () => {
    try {
      await metaService.excluir(metaParaExcluir.id)
      await carregarDados()
      setMetaParaExcluir(null)
    } catch (erroRequisicao) {
      setErro('Não foi possível excluir a meta.')
      setMetaParaExcluir(null)
    }
  }

  const handleSalvarAporte = async (dto) => {
    await metaService.registrarAporte(metaParaAporte.id, dto)
    setMetaParaAporte(null)
    setErro('')
    await carregarDados()
  }

  const confirmarExclusaoAporte = async () => {
    try {
      await metaService.excluirAporte(aporteParaExcluir.metaId, aporteParaExcluir.aporteId)
      await carregarDados()
      setAporteParaExcluir(null)
    } catch (erroRequisicao) {
      setErro('Não foi possível excluir o aporte.')
      setAporteParaExcluir(null)
    }
  }

  return (
    <div className={styles.pagina}>
      <div className={styles.cabecalho}>
        <h1>Metas Financeiras</h1>
        <button type="button" className={styles.botaoNova} onClick={abrirNovaMeta}>
          + Nova Meta
        </button>
      </div>

      {erro ? (
        <p className={styles.errorMessage} aria-live="polite">
          {erro}
        </p>
      ) : null}

      {carregando ? (
        <p>Carregando...</p>
      ) : metas.length === 0 ? (
        <p className={styles.vazio}>Nenhuma meta cadastrada ainda.</p>
      ) : (
        <div className={styles.grade}>
          {metas.map((meta) => {
            const percentual = Math.min(Number(meta.percentualConcluido), 100)
            return (
              <div key={meta.id} className={styles.card}>
                <div className={styles.cardTopo}>
                  <h2>{meta.nome}</h2>
                  <div className={styles.acoesCard}>
                    <button type="button" onClick={() => abrirEdicao(meta)} aria-label={`Editar ${meta.nome}`}>
                      ✎
                    </button>
                    <button type="button" onClick={() => setMetaParaExcluir(meta)} aria-label={`Excluir ${meta.nome}`}>
                      🗑
                    </button>
                  </div>
                </div>

                <div className={styles.metaInfo}>
                  {meta.categoriaNome ? (
                    <span className={styles.badgeCategoria}>Auto: {meta.categoriaNome}</span>
                  ) : null}
                  {meta.dataAlvo ? (
                    <span className={styles.badgeData}>Até {formatadorData.format(new Date(`${meta.dataAlvo}T00:00:00`))}</span>
                  ) : null}
                </div>

                <div className={styles.barraProgresso}>
                  <div className={styles.barraPreenchida} style={{ width: `${percentual}%` }} />
                </div>

                <div className={styles.valores}>
                  <strong>{formatadorMoeda.format(meta.valorAtual)}</strong>
                  <span> de {formatadorMoeda.format(meta.valorAlvo)} ({percentual.toFixed(0)}%)</span>
                </div>

                {meta.aportes.length > 0 ? (
                  <div className={styles.listaAportes}>
                    {meta.aportes.map((aporte) => (
                      <div key={aporte.id} className={styles.aporteItem}>
                        <span>
                          {formatadorData.format(new Date(`${aporte.data}T00:00:00`))} —{' '}
                          {formatadorMoeda.format(aporte.valor)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAporteParaExcluir({ metaId: meta.id, aporteId: aporte.id })}
                          aria-label="Excluir aporte"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                <button type="button" className={styles.botaoAporte} onClick={() => setMetaParaAporte(meta)}>
                  + Registrar aporte
                </button>
              </div>
            )
          })}
        </div>
      )}

      {modalMetaAberto ? (
        <ModalMeta
          metaEmEdicao={metaEmEdicao}
          categoriasReceita={categoriasReceita}
          onSalvar={handleSalvarMeta}
          onCancelar={fecharModalMeta}
        />
      ) : null}

      {metaParaAporte ? (
        <ModalAporte
          nomeMeta={metaParaAporte.nome}
          onSalvar={handleSalvarAporte}
          onCancelar={() => setMetaParaAporte(null)}
        />
      ) : null}

      {metaParaExcluir ? (
        <ModalConfirmacao
          titulo="Excluir meta"
          mensagem={`Tem certeza que deseja excluir "${metaParaExcluir.nome}"? Os aportes registrados nela também serão excluídos.`}
          onConfirmar={confirmarExclusaoMeta}
          onCancelar={() => setMetaParaExcluir(null)}
        />
      ) : null}

      {aporteParaExcluir ? (
        <ModalConfirmacao
          titulo="Excluir aporte"
          mensagem="Tem certeza que deseja excluir esse aporte?"
          onConfirmar={confirmarExclusaoAporte}
          onCancelar={() => setAporteParaExcluir(null)}
        />
      ) : null}
    </div>
  )
}

export default Metas
