import { useMemo, useState } from 'react'
import * as metaService from '../services/metaService'
import styles from './DestinarMetasImportacao.module.css'

const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const formatadorData = new Intl.DateTimeFormat('pt-BR')

const chaveValor = (metaId, transacaoId) => `${metaId}-${transacaoId}`
const centavos = (valor) => Math.round(Number(valor) * 100)

// Passo opcional depois de confirmar a importação: as transações já foram criadas, aqui só se registra ContribuicaoMeta
function DestinarMetasImportacao({ grupos, onConcluir }) {
  const [valores, setValores] = useState({})
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [registradas, setRegistradas] = useState(0)
  const [centavosRegistrados, setCentavosRegistrados] = useState(0)

  const receitasPorId = useMemo(() => {
    const mapa = new Map()
    grupos.forEach((grupo) => grupo.receitas.forEach((receita) => mapa.set(receita.id, receita)))
    return mapa
  }, [grupos])

  const totalPorTransacao = (transacaoId, ignorarChave) =>
    grupos.reduce((soma, grupo) => {
      const chave = chaveValor(grupo.meta.id, transacaoId)
      return chave === ignorarChave ? soma : soma + centavos(valores[chave] || 0)
    }, 0)

  const totalPorMeta = (grupo) =>
    grupo.receitas.reduce((soma, receita) => soma + centavos(valores[chaveValor(grupo.meta.id, receita.id)] || 0), 0)

  const alterarValor = (metaId, transacaoId, valor) => {
    setValores((atual) => ({ ...atual, [chaveValor(metaId, transacaoId)]: valor }))
  }

  // Preenche as receitas da meta em ordem até completar o que falta, respeitando o que já foi destinado a outras metas
  const completarMeta = (grupo) => {
    let faltando = centavos(grupo.restante)
    const novos = { ...valores }
    grupo.receitas.forEach((receita) => {
      const chave = chaveValor(grupo.meta.id, receita.id)
      const livreNaTransacao = centavos(receita.valor) - totalPorTransacao(receita.id, chave)
      const valor = Math.max(0, Math.min(faltando, livreNaTransacao))
      novos[chave] = valor > 0 ? (valor / 100).toFixed(2) : ''
      faltando -= valor
    })
    setValores(novos)
  }

  const errosPorGrupo = grupos.map((grupo) => totalPorMeta(grupo) > centavos(grupo.restante))
  const transacoesEstouradas = [...receitasPorId.values()]
    .filter((receita) => totalPorTransacao(receita.id) > centavos(receita.valor))
  const totalDestinado = grupos.reduce((soma, grupo) => soma + totalPorMeta(grupo), 0)
  const temErro = errosPorGrupo.some(Boolean) || transacoesEstouradas.length > 0

  const handleDestinar = async () => {
    const contribuicoes = grupos.flatMap((grupo) =>
      grupo.receitas
        .map((receita) => ({
          metaId: grupo.meta.id,
          transacaoId: receita.id,
          valor: Number(valores[chaveValor(grupo.meta.id, receita.id)] || 0),
        }))
        .filter((contribuicao) => contribuicao.valor > 0),
    )

    setErro('')
    setSalvando(true)
    let sucesso = registradas
    let centavosSucesso = centavosRegistrados
    // Retomada após erro: as que já foram registradas ficam de fora (os campos travam depois da primeira)
    for (const contribuicao of contribuicoes.slice(registradas)) {
      try {
        await metaService.contribuir(contribuicao.metaId, { transacaoId: contribuicao.transacaoId, valor: contribuicao.valor })
        sucesso += 1
        centavosSucesso += centavos(contribuicao.valor)
        setRegistradas(sucesso)
        setCentavosRegistrados(centavosSucesso)
      } catch (erroRequisicao) {
        setErro(
          `${sucesso} de ${contribuicoes.length} contribuição(ões) registrada(s). ` +
            (erroRequisicao.response?.data?.mensagem || 'Não foi possível registrar as demais.'),
        )
        setSalvando(false)
        return
      }
    }
    onConcluir(totalDestinado / 100)
  }

  return (
    <div className={styles.etapa}>
      <p className={styles.ajuda}>
        Algumas receitas importadas são de categorias vinculadas a metas. Quanto delas você quer destinar? Pode
        deixar em branco o que não for pra meta — as transações já foram importadas.
      </p>

      <div className={styles.grupos}>
        {grupos.map((grupo, indiceGrupo) => (
          <section key={grupo.meta.id} className={styles.grupo}>
            <header className={styles.grupoTopo}>
              <div>
                <h3>{grupo.meta.nome}</h3>
                <span className={styles.restante}>
                  Faltam {formatadorMoeda.format(grupo.restante)} de {formatadorMoeda.format(grupo.meta.valorAlvo)}
                </span>
              </div>
              <button
                type="button"
                className={styles.botaoCompletar}
                onClick={() => completarMeta(grupo)}
                disabled={salvando || registradas > 0}
              >
                Completar a meta
              </button>
            </header>

            <ul className={styles.receitas}>
              {grupo.receitas.map((receita) => {
                const chave = chaveValor(grupo.meta.id, receita.id)
                const estourada = transacoesEstouradas.includes(receita)
                return (
                  <li key={receita.id} className={styles.receita}>
                    <div className={styles.receitaInfo}>
                      <span className={styles.receitaDescricao} title={receita.descricao}>
                        {receita.descricao || receita.categoriaNome}
                      </span>
                      <span className={styles.receitaDetalhe}>
                        {formatadorData.format(new Date(`${receita.data}T00:00:00`))} ·{' '}
                        {formatadorMoeda.format(receita.valor)}
                      </span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0,00"
                      aria-label={`Valor para ${grupo.meta.nome}`}
                      aria-invalid={estourada}
                      className={`${styles.input} ${estourada ? styles.inputErro : ''}`}
                      value={valores[chave] ?? ''}
                      onChange={(event) => alterarValor(grupo.meta.id, receita.id, event.target.value)}
                      disabled={salvando || registradas > 0}
                    />
                  </li>
                )
              })}
            </ul>

            {errosPorGrupo[indiceGrupo] ? (
              <p className={styles.erroCampo}>
                A soma passa do que falta pra meta ({formatadorMoeda.format(grupo.restante)}).
              </p>
            ) : null}
          </section>
        ))}
      </div>

      {transacoesEstouradas.length > 0 ? (
        <p className={styles.erroCampo}>
          A soma destinada de uma receita passa do valor dela (marcada em vermelho).
        </p>
      ) : null}

      {erro ? (
        <p className={styles.errorMessage} aria-live="polite">
          {erro}
        </p>
      ) : null}

      <div className={styles.acoes}>
        <button
          type="button"
          className={styles.pular}
          onClick={() => onConcluir(centavosRegistrados / 100)}
          disabled={salvando}
        >
          {registradas > 0 ? 'Concluir sem o restante' : 'Pular'}
        </button>
        <button
          type="button"
          className={styles.confirmar}
          onClick={handleDestinar}
          disabled={salvando || temErro || totalDestinado === 0}
        >
          {salvando ? 'Registrando...' : `Destinar ${formatadorMoeda.format(totalDestinado / 100)}`}
        </button>
      </div>
    </div>
  )
}

export default DestinarMetasImportacao
