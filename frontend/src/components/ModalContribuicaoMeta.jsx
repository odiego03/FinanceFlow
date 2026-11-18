import { useCallback, useEffect, useMemo, useState } from 'react'
import { mensagemDeErro } from '../services/api'
import * as metaService from '../services/metaService'
import { Esqueleto } from './Esqueleto'
import Modal from './Modal'
import styles from './ModalContribuicaoMeta.module.css'

const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

// Diz em palavras o que acontece com o valor digitado: quanto sai da meta (e volta pra receita) ou quanto entra a mais
function resumoDaMudanca(atual, novo) {
  if (!novo || novo <= 0 || novo === Number(atual)) return null
  const diferenca = Math.abs(novo - Number(atual))
  const ficam = `Ficam ${formatadorMoeda.format(novo)} guardados.`
  return novo < Number(atual)
    ? { tirando: true, texto: `Vai tirar ${formatadorMoeda.format(diferenca)} da meta e devolver à receita. ${ficam}` }
    : { tirando: false, texto: `Vai guardar mais ${formatadorMoeda.format(diferenca)} nesta meta. ${ficam}` }
}

// Serve pra duas coisas: guardar parte da receita em metas (formulário de baixo) e mexer no que ela já guardou
// (lista de cima: mudar o valor ou tirar tudo). onAlterado recarrega os dados da tela depois de mudar uma contribuição
function ModalContribuicaoMeta({ transacao, metas, onConfirmar, onAlterado, onFechar }) {
  const [valores, setValores] = useState({})
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [guardadas, setGuardadas] = useState([])
  const [carregandoGuardadas, setCarregandoGuardadas] = useState(true)
  const [valoresGuardados, setValoresGuardados] = useState({})
  const [erroGuardadas, setErroGuardadas] = useState('')
  const [ocupadaId, setOcupadaId] = useState(null)
  const [removendoId, setRemovendoId] = useState(null)

  const carregarGuardadas = useCallback(async () => {
    try {
      const dados = await metaService.listarContribuicoesDaTransacao(transacao.id)
      setGuardadas(dados)
      setValoresGuardados(Object.fromEntries(dados.map((item) => [item.id, String(item.valor)])))
    } catch (erroRequisicao) {
      setErroGuardadas(mensagemDeErro(erroRequisicao, 'Não foi possível carregar o que já foi guardado.'))
    } finally {
      setCarregandoGuardadas(false)
    }
  }, [transacao.id])

  useEffect(() => {
    carregarGuardadas()
  }, [carregarGuardadas])

  const temGuardadas = guardadas.length > 0 || (carregandoGuardadas && Number(transacao.valorContribuidoMetas || 0) > 0)

  const alterarGuardada = (id, valor) => {
    setErroGuardadas('')
    setValoresGuardados((atual) => ({ ...atual, [id]: valor }))
  }

  const salvarGuardada = async (item) => {
    const novoValor = Number(valoresGuardados[item.id])
    if (!novoValor || novoValor <= 0) {
      setErroGuardadas('Informe um valor maior que zero, ou use "Tirar todo o valor".')
      return
    }
    if (novoValor > Number(item.maximo)) {
      setErroGuardadas(`O máximo para essa meta é ${formatadorMoeda.format(item.maximo)}.`)
      return
    }
    setOcupadaId(item.id)
    try {
      await metaService.atualizarContribuicao(item.metaId, item.id, { valor: novoValor })
      await onAlterado()
      await carregarGuardadas()
    } catch (erroRequisicao) {
      setErroGuardadas(mensagemDeErro(erroRequisicao, 'Não foi possível atualizar o valor.'))
    } finally {
      setOcupadaId(null)
    }
  }

  const removerGuardada = async (item) => {
    setOcupadaId(item.id)
    try {
      await metaService.removerContribuicao(item.metaId, item.id)
      setRemovendoId(null)
      await onAlterado()
      await carregarGuardadas()
    } catch (erroRequisicao) {
      setErroGuardadas(mensagemDeErro(erroRequisicao, 'Não foi possível tirar o valor da meta.'))
    } finally {
      setOcupadaId(null)
    }
  }

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
      titulo={temGuardadas ? 'Valores desta receita nas metas' : 'Guardar parte desta receita numa meta?'}
      subtitulo={`${formatadorMoeda.format(transacao.valor)} em "${transacao.categoriaNome}" · ${formatadorMoeda.format(
        saldoTransacao,
      )} disponível para destinar`}
      onFechar={onFechar}
      rodape={
        <>
          <button type="button" className={styles.agoraNao} onClick={onFechar}>
            {temGuardadas ? 'Fechar' : 'Agora não'}
          </button>
          <button type="submit" form="form-contribuicao" className={styles.confirmar} disabled={salvando || totalInformado <= 0}>
            {salvando ? 'Guardando...' : totalInformado > 0 ? `Guardar ${formatadorMoeda.format(totalInformado)}` : 'Guardar'}
          </button>
        </>
      }
    >
      {temGuardadas ? (
        <section className={styles.guardadas} aria-label="Já guardado nas metas" aria-busy={carregandoGuardadas}>
          <h3>Já guardado nas metas</h3>
          {carregandoGuardadas && guardadas.length === 0 ? (
            <div className={styles.itemGuardado}>
              <Esqueleto largura="40%" altura={18} />
              <Esqueleto altura={44} raio={10} />
              <Esqueleto largura="45%" altura={14} />
            </div>
          ) : null}
          {guardadas.map((item) => {
            const novoValor = Number(valoresGuardados[item.id])
            const alterado = novoValor !== Number(item.valor)
            const resumo = resumoDaMudanca(item.valor, novoValor)
            const ocupada = ocupadaId === item.id
            return (
              <div key={item.id} className={styles.itemGuardado}>
                <strong>{item.metaNome}</strong>
                <span className={styles.rotulo}>Quanto manter nesta meta</span>
                <div className={styles.linhaValor}>
                  <label className={styles.campoValor}>
                    <span aria-hidden="true">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={item.maximo}
                      inputMode="decimal"
                      value={valoresGuardados[item.id] ?? ''}
                      onChange={(event) => alterarGuardada(item.id, event.target.value)}
                      aria-label={`Valor guardado em ${item.metaNome}`}
                      disabled={ocupada}
                    />
                  </label>
                  <button
                    type="button"
                    className={styles.salvarGuardada}
                    onClick={() => salvarGuardada(item)}
                    disabled={ocupada || !alterado}
                  >
                    {alterado && novoValor > 0 ? `Manter ${formatadorMoeda.format(novoValor)}` : 'Manter'}
                  </button>
                  {removendoId === item.id ? (
                    <span className={styles.confirmacao}>
                      Tirar {formatadorMoeda.format(item.valor)} desta meta?
                      <button type="button" className={styles.sim} onClick={() => removerGuardada(item)} disabled={ocupada}>
                        Sim
                      </button>
                      <button type="button" className={styles.nao} onClick={() => setRemovendoId(null)}>
                        Cancelar
                      </button>
                    </span>
                  ) : (
                    <button type="button" className={styles.tirar} onClick={() => setRemovendoId(item.id)} disabled={ocupada}>
                      Tirar todo o valor
                    </button>
                  )}
                </div>
                {resumo ? <span className={resumo.tirando ? styles.resumoTirar : styles.resumo}>{resumo.texto}</span> : null}
                <span className={styles.maximo}>Pode ir até {formatadorMoeda.format(item.maximo)}.</span>
              </div>
            )
          })}
          {erroGuardadas ? (
            <p className={styles.erro} role="alert">
              {erroGuardadas}
            </p>
          ) : null}
        </section>
      ) : null}

      {metasComLimite.some((meta) => meta.restanteMeta > 0) && saldoTransacao > 0 ? (
        <h3 className={styles.tituloNovo}>{temGuardadas ? 'Guardar mais' : null}</h3>
      ) : null}

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
