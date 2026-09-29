import { useMemo, useState } from 'react'
import styles from './ModalMeta.module.css'

const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function ModalContribuicaoMeta({ transacao, metas, onConfirmar, onFechar }) {
  const [valores, setValores] = useState({})
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const saldoTransacao = Number(transacao.valor) - Number(transacao.valorContribuidoMetas || 0)

  const metasComLimite = useMemo(
    () =>
      metas.map((meta) => {
        const restanteMeta = Math.max(0, Number(meta.valorAlvo) - Number(meta.valorAtual))
        return { ...meta, restanteMeta, maximo: Math.min(saldoTransacao, restanteMeta) }
      }),
    [metas, saldoTransacao],
  )

  const totalInformado = useMemo(
    () => Object.values(valores).reduce((soma, valor) => soma + (Number(valor) || 0), 0),
    [valores],
  )

  const alterarValor = (metaId, valor) => {
    setValores((atual) => ({ ...atual, [metaId]: valor }))
  }

  const handleConfirmar = async (event) => {
    event.preventDefault()

    const contribuicoes = metasComLimite
      .map((meta) => ({ metaId: meta.id, valor: Number(valores[meta.id]) || 0, maximo: meta.maximo }))
      .filter((item) => item.valor > 0)

    if (contribuicoes.length === 0) {
      setErro('Informe um valor em pelo menos uma meta, ou clique em "Agora não".')
      return
    }
    if (contribuicoes.some((item) => item.valor > item.maximo)) {
      setErro('Um dos valores passa do limite permitido pra essa meta ou transação.')
      return
    }
    if (totalInformado > saldoTransacao) {
      setErro('A soma dos valores não pode ser maior que o saldo disponível da transação.')
      return
    }

    setSalvando(true)
    try {
      await onConfirmar(contribuicoes.map(({ metaId, valor }) => ({ metaId, valor })))
    } catch (erroRequisicao) {
      setErro('Não foi possível registrar a contribuição.')
      setSalvando(false)
    }
  }

  return (
    <div className={styles.backdrop} onClick={onFechar}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <h2>Adicionar à meta financeira?</h2>
        <p className={styles.ajuda}>
          Essa receita de {formatadorMoeda.format(transacao.valor)} está na categoria "{transacao.categoriaNome}",
          vinculada a {metas.length > 1 ? 'estas metas' : 'esta meta'}. Quanto quer destinar?
        </p>

        <form onSubmit={handleConfirmar}>
          {metasComLimite.map((meta) => {
            const metaConcluida = meta.restanteMeta <= 0
            return (
              <div key={meta.id}>
                <label className={styles.label} htmlFor={`contribuicao-${meta.id}`}>
                  {meta.nome}
                </label>
                <input
                  id={`contribuicao-${meta.id}`}
                  type="number"
                  step="0.01"
                  min="0"
                  max={meta.maximo}
                  placeholder="0,00"
                  className={styles.input}
                  value={valores[meta.id] ?? ''}
                  onChange={(event) => alterarValor(meta.id, event.target.value)}
                  disabled={metaConcluida}
                />
                <span className={styles.ajuda}>
                  {metaConcluida ? 'Meta já concluída.' : `Máximo de ${formatadorMoeda.format(meta.maximo)} pra essa meta.`}
                </span>
              </div>
            )
          })}

          {erro ? (
            <p className={styles.errorMessage} aria-live="polite">
              {erro}
            </p>
          ) : null}

          <div className={styles.acoes}>
            <button type="button" className={styles.cancelar} onClick={onFechar}>
              Agora não
            </button>
            <button type="submit" className={styles.adicionar} disabled={salvando}>
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ModalContribuicaoMeta
