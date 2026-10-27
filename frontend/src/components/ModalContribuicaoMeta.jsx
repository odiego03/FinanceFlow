import { useMemo, useState } from 'react'
import { mensagemDeErro } from '../services/api'
import Modal from './Modal'
import styles from './ModalContribuicaoMeta.module.css'

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
  const sobraTransacao = saldoTransacao - totalInformado

  const alterarValor = (metaId, valor) => {
    setErro('')
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
      setErro(mensagemDeErro(erroRequisicao, 'Não foi possível registrar a contribuição.'))
      setSalvando(false)
    }
  }

  return (
    <Modal
      titulo="Guardar parte desta receita numa meta?"
      subtitulo={`${formatadorMoeda.format(transacao.valor)} em "${transacao.categoriaNome}" · ${formatadorMoeda.format(
        saldoTransacao,
      )} disponível para destinar`}
      onFechar={onFechar}
      rodape={
        <>
          <button type="button" className={styles.agoraNao} onClick={onFechar}>
            Agora não
          </button>
          <button type="submit" form="form-contribuicao" className={styles.confirmar} disabled={salvando || totalInformado <= 0}>
            {salvando ? 'Guardando...' : totalInformado > 0 ? `Guardar ${formatadorMoeda.format(totalInformado)}` : 'Guardar'}
          </button>
        </>
      }
    >
      <form id="form-contribuicao" className={styles.formulario} onSubmit={handleConfirmar}>
        {metasComLimite.map((meta) => {
          const metaConcluida = meta.restanteMeta <= 0
          const percentual = Math.min(100, (Number(meta.valorAtual) / Number(meta.valorAlvo)) * 100)
          return (
            <div key={meta.id} className={styles.meta}>
              <div className={styles.metaTopo}>
                <strong>{meta.nome}</strong>
                <span>
                  {formatadorMoeda.format(meta.valorAtual)} de {formatadorMoeda.format(meta.valorAlvo)}
                </span>
              </div>
              <div className={styles.barra} aria-hidden="true">
                <div style={{ width: `${percentual}%` }} />
              </div>
              {metaConcluida ? (
                <p className={styles.concluida}>
                  <i className="bi bi-check-circle-fill" aria-hidden="true" /> Meta já concluída
                </p>
              ) : (
                <div className={styles.linhaValor}>
                  <label className={styles.campoValor}>
                    <span aria-hidden="true">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={meta.maximo}
                      inputMode="decimal"
                      placeholder="0,00"
                      value={valores[meta.id] ?? ''}
                      onChange={(event) => alterarValor(meta.id, event.target.value)}
                      aria-label={`Valor para ${meta.nome}`}
                    />
                  </label>
                  <button
                    type="button"
                    className={styles.usarMaximo}
                    onClick={() => alterarValor(meta.id, String(meta.maximo))}
                  >
                    Usar o máximo ({formatadorMoeda.format(meta.maximo)})
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {totalInformado > 0 ? (
          <p className={sobraTransacao < 0 ? styles.sobraNegativa : styles.sobra}>
            {sobraTransacao >= 0
              ? `Continuam livres ${formatadorMoeda.format(sobraTransacao)} desta receita.`
              : `Passou ${formatadorMoeda.format(-sobraTransacao)} do disponível.`}
          </p>
        ) : null}

        {erro ? (
          <p className={styles.erro} role="alert">
            {erro}
          </p>
        ) : null}
      </form>
    </Modal>
  )
}

export default ModalContribuicaoMeta
