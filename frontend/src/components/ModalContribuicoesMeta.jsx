import { useCallback, useEffect, useState } from 'react'
import { mensagemDeErro } from '../services/api'
import * as metaService from '../services/metaService'
import Modal from './Modal'
import styles from './ModalContribuicoesMeta.module.css'

const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const formatadorData = new Intl.DateTimeFormat('pt-BR')

// Lista o que já foi guardado na meta, receita por receita, e deixa mudar o valor de cada uma ou tirar tudo
function ModalContribuicoesMeta({ meta, onAlterado, onFechar }) {
  const [contribuicoes, setContribuicoes] = useState([])
  const [valores, setValores] = useState({})
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [ocupadaId, setOcupadaId] = useState(null)
  const [removendoId, setRemovendoId] = useState(null)

  const carregar = useCallback(async () => {
    try {
      const dados = await metaService.listarContribuicoes(meta.id)
      setContribuicoes(dados)
      setValores(Object.fromEntries(dados.map((item) => [item.id, String(item.valor)])))
    } catch (erroRequisicao) {
      setErro(mensagemDeErro(erroRequisicao, 'Não foi possível carregar as contribuições.'))
    } finally {
      setCarregando(false)
    }
  }, [meta.id])

  useEffect(() => {
    carregar()
  }, [carregar])

  const alterarValor = (id, valor) => {
    setErro('')
    setValores((atual) => ({ ...atual, [id]: valor }))
  }

  const salvar = async (item) => {
    const novoValor = Number(valores[item.id])
    if (!novoValor || novoValor <= 0) {
      setErro('Informe um valor maior que zero, ou use "Tirar tudo".')
      return
    }
    if (novoValor > Number(item.maximo)) {
      setErro(`O máximo para essa contribuição é ${formatadorMoeda.format(item.maximo)}.`)
      return
    }
    setOcupadaId(item.id)
    try {
      await metaService.atualizarContribuicao(meta.id, item.id, { valor: novoValor })
      await carregar()
      await onAlterado()
    } catch (erroRequisicao) {
      setErro(mensagemDeErro(erroRequisicao, 'Não foi possível atualizar a contribuição.'))
    } finally {
      setOcupadaId(null)
    }
  }

  const remover = async (item) => {
    setOcupadaId(item.id)
    try {
      await metaService.removerContribuicao(meta.id, item.id)
      setRemovendoId(null)
      await carregar()
      await onAlterado()
    } catch (erroRequisicao) {
      setErro(mensagemDeErro(erroRequisicao, 'Não foi possível remover a contribuição.'))
    } finally {
      setOcupadaId(null)
    }
  }

  const total = contribuicoes.reduce((soma, item) => soma + Number(item.valor), 0)

  return (
    <Modal
      titulo={`Contribuições de "${meta.nome}"`}
      subtitulo={`${formatadorMoeda.format(total)} guardados de ${formatadorMoeda.format(meta.valorAlvo)}`}
      onFechar={onFechar}
      rodape={
        <button type="button" className={styles.fechar} onClick={onFechar}>
          Fechar
        </button>
      }
    >
      {carregando ? <p className={styles.aviso}>Carregando...</p> : null}

      {!carregando && contribuicoes.length === 0 ? (
        <p className={styles.aviso}>
          Nada guardado nessa meta ainda. Ao lançar uma receita, você escolhe quanto dela vai pra meta.
        </p>
      ) : null}

      <div className={styles.lista}>
        {contribuicoes.map((item) => {
          const alterado = Number(valores[item.id]) !== Number(item.valor)
          const ocupada = ocupadaId === item.id
          return (
            <div key={item.id} className={styles.item}>
              <div className={styles.origem}>
                <strong>{item.descricao || item.categoriaNome}</strong>
                <span>
                  {formatadorData.format(new Date(`${item.data}T00:00:00`))} · receita de{' '}
                  {formatadorMoeda.format(item.valorTransacao)}
                </span>
              </div>

              <div className={styles.linhaValor}>
                <label className={styles.campoValor}>
                  <span aria-hidden="true">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={item.maximo}
                    inputMode="decimal"
                    value={valores[item.id] ?? ''}
                    onChange={(event) => alterarValor(item.id, event.target.value)}
                    aria-label={`Valor guardado de ${item.descricao || item.categoriaNome}`}
                    disabled={ocupada}
                  />
                </label>
                <button
                  type="button"
                  className={styles.salvar}
                  onClick={() => salvar(item)}
                  disabled={ocupada || !alterado}
                >
                  Salvar
                </button>
                {removendoId === item.id ? (
                  <span className={styles.confirmacao}>
                    Tirar tudo?
                    <button type="button" className={styles.sim} onClick={() => remover(item)} disabled={ocupada}>
                      Sim
                    </button>
                    <button type="button" className={styles.nao} onClick={() => setRemovendoId(null)}>
                      Não
                    </button>
                  </span>
                ) : (
                  <button type="button" className={styles.tirar} onClick={() => setRemovendoId(item.id)} disabled={ocupada}>
                    Tirar tudo
                  </button>
                )}
              </div>
              <span className={styles.maximo}>Pode ir até {formatadorMoeda.format(item.maximo)}.</span>
            </div>
          )
        })}
      </div>

      {erro ? (
        <p className={styles.erro} role="alert">
          {erro}
        </p>
      ) : null}
    </Modal>
  )
}

export default ModalContribuicoesMeta
