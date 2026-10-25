import { useEffect, useMemo, useState } from 'react'
import SeletorCategoria from './SeletorCategoria'
import { mensagemDeErro } from '../services/api'
import * as parcelamentoService from '../services/parcelamentoService'
import styles from './ModalTransacao.module.css'

const MINIMO_PARCELAS = 2
const MAXIMO_PARCELAS = 60

const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

// Mesma divisão do backend: parcelas arredondadas pra baixo, centavos que sobram na última
function dividirEmParcelas(valorTotal, quantidade) {
  const totalCentavos = Math.round(valorTotal * 100)
  const parcela = Math.floor(totalCentavos / quantidade)
  return { parcela: parcela / 100, ultima: (totalCentavos - parcela * (quantidade - 1)) / 100 }
}

function ModalTransacao({ transacaoEmEdicao, categorias, onSalvar, onSalvarParcelamento, onCancelar }) {
  const [tipo, setTipo] = useState(transacaoEmEdicao?.tipo ?? 'DESPESA')
  const [categoriaId, setCategoriaId] = useState(
    transacaoEmEdicao ? String(transacaoEmEdicao.categoriaId) : '',
  )
  const [valor, setValor] = useState(transacaoEmEdicao ? String(transacaoEmEdicao.valor) : '')
  const [descricao, setDescricao] = useState(transacaoEmEdicao?.descricao ?? '')
  const [data, setData] = useState(transacaoEmEdicao?.data ?? new Date().toISOString().slice(0, 10))
  const [parcelar, setParcelar] = useState(false)
  const [quantidadeParcelas, setQuantidadeParcelas] = useState('2')
  const [sugestao, setSugestao] = useState(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const categoriasDoTipo = useMemo(() => categorias.filter((c) => c.tipo === tipo), [categorias, tipo])
  const podeParcelar = !transacaoEmEdicao && tipo === 'DESPESA'
  const parcelado = podeParcelar && parcelar

  // Espera o usuário parar de digitar antes de pedir a margem livre ao backend
  useEffect(() => {
    if (!parcelado) {
      setSugestao(null)
      return undefined
    }
    const temporizador = setTimeout(async () => {
      try {
        setSugestao(await parcelamentoService.sugestao(Number(valor) > 0 ? Number(valor) : null, data))
      } catch {
        setSugestao(null)
      }
    }, 400)
    return () => clearTimeout(temporizador)
  }, [parcelado, valor, data])

  const quantidade = Number(quantidadeParcelas)
  const quantidadeValida =
    Number.isInteger(quantidade) && quantidade >= MINIMO_PARCELAS && quantidade <= MAXIMO_PARCELAS
  const divisao = parcelado && Number(valor) > 0 && quantidadeValida ? dividirEmParcelas(Number(valor), quantidade) : null
  const margemLivre = sugestao?.margemLivre ?? null
  const cabeNaMargem = divisao && margemLivre !== null ? divisao.ultima <= margemLivre : null

  const trocarTipo = (novoTipo) => {
    setTipo(novoTipo)
    setCategoriaId('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!categoriaId) {
      setErro('Selecione uma categoria.')
      return
    }
    if (!valor || Number(valor) <= 0) {
      setErro('Informe um valor válido.')
      return
    }
    if (parcelado && !descricao.trim()) {
      setErro('Informe uma descrição para o parcelamento.')
      return
    }
    if (parcelado && !quantidadeValida) {
      setErro(`A quantidade de parcelas deve ser entre ${MINIMO_PARCELAS} e ${MAXIMO_PARCELAS}.`)
      return
    }

    setSalvando(true)
    try {
      if (parcelado) {
        await onSalvarParcelamento({
          categoriaId: Number(categoriaId),
          descricao: descricao.trim(),
          valorTotal: Number(valor),
          quantidadeParcelas: quantidade,
          dataPrimeiraParcela: data,
        })
      } else {
        await onSalvar({
          categoriaId: Number(categoriaId),
          tipo,
          valor: Number(valor),
          descricao: descricao || null,
          data,
        })
      }
    } catch (erroRequisicao) {
      setErro(mensagemDeErro(erroRequisicao, 'Não foi possível salvar a transação.'))
      setSalvando(false)
    }
  }

  const renderizarSugestao = () => {
    if (!sugestao) return null

    if (margemLivre === null) {
      return (
        <p className={styles.sugestao}>
          <i className="bi bi-info-circle" aria-hidden="true" /> Sem receitas nos últimos 3 meses, então não dá pra
          calcular quanto cabe no seu orçamento.
        </p>
      )
    }

    const detalhes = (
      <span className={styles.sugestaoDetalhes}>
        Renda média {formatadorMoeda.format(sugestao.rendaMedia)} − despesas médias{' '}
        {formatadorMoeda.format(sugestao.despesasMedia)}
        {sugestao.parcelasComprometidas > 0
          ? ` − parcelas já agendadas ${formatadorMoeda.format(sugestao.parcelasComprometidas)}`
          : ''}{' '}
        (últimos 3 meses)
      </span>
    )

    if (margemLivre <= 0) {
      return (
        <p className={`${styles.sugestao} ${styles.sugestaoAlerta}`}>
          <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" /> Sua margem livre está em{' '}
          <strong>{formatadorMoeda.format(margemLivre)}</strong>: suas despesas já consomem toda a renda média.
          Parcelar agora aperta o orçamento.
          {detalhes}
        </p>
      )
    }

    const minima = sugestao.quantidadeMinimaParcelas
    return (
      <p className={styles.sugestao}>
        <i className="bi bi-lightbulb" aria-hidden="true" /> Sua margem livre é de{' '}
        <strong>{formatadorMoeda.format(margemLivre)}/mês</strong>.{' '}
        {minima ? (
          <>
            A partir de <strong>{minima}x</strong> a parcela cabe no orçamento.{' '}
            {quantidade !== minima ? (
              <button type="button" className={styles.usarSugestao} onClick={() => setQuantidadeParcelas(String(minima))}>
                Usar {minima}x
              </button>
            ) : null}
          </>
        ) : Number(valor) > 0 ? (
          `Nem em ${MAXIMO_PARCELAS}x a parcela cabe nessa margem.`
        ) : null}
        {detalhes}
      </p>
    )
  }

  return (
    <div className={styles.backdrop} onClick={onCancelar}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <h2>{transacaoEmEdicao ? 'Editar Transação' : 'Nova Transação'}</h2>

        <form onSubmit={handleSubmit}>
          <span className={styles.label}>Tipo</span>
          <div className={styles.tipoGroup}>
            <button
              type="button"
              className={`${styles.tipoBotao} ${tipo === 'RECEITA' ? styles.tipoReceitaAtivo : ''}`}
              onClick={() => trocarTipo('RECEITA')}
            >
              Receita
            </button>
            <button
              type="button"
              className={`${styles.tipoBotao} ${tipo === 'DESPESA' ? styles.tipoDespesaAtivo : ''}`}
              onClick={() => trocarTipo('DESPESA')}
            >
              Despesa
            </button>
          </div>

          {podeParcelar ? (
            <label className={styles.parcelarToggle}>
              <input type="checkbox" checked={parcelar} onChange={(event) => setParcelar(event.target.checked)} />
              <span>
                <i className="bi bi-credit-card" aria-hidden="true" /> Parcelar esta compra
              </span>
            </label>
          ) : null}

          <label className={styles.label} htmlFor="valorTransacao">
            {parcelado ? 'Valor total' : 'Valor'}
          </label>
          <input
            id="valorTransacao"
            type="number"
            step="0.01"
            min="0.01"
            className={styles.input}
            value={valor}
            onChange={(event) => setValor(event.target.value)}
          />

          {parcelado ? (
            <>
              <label className={styles.label} htmlFor="quantidadeParcelas">
                Quantidade de parcelas
              </label>
              <input
                id="quantidadeParcelas"
                type="number"
                step="1"
                min={MINIMO_PARCELAS}
                max={MAXIMO_PARCELAS}
                className={styles.input}
                value={quantidadeParcelas}
                onChange={(event) => setQuantidadeParcelas(event.target.value)}
              />
              {divisao ? (
                <p className={styles.resumoParcelas}>
                  {quantidade}x de {formatadorMoeda.format(divisao.parcela)}
                  {divisao.ultima !== divisao.parcela ? ` (última de ${formatadorMoeda.format(divisao.ultima)})` : ''}
                  {cabeNaMargem === true ? (
                    <span className={styles.cabe}>
                      <i className="bi bi-check-circle-fill" aria-hidden="true" /> Cabe no orçamento
                    </span>
                  ) : null}
                  {cabeNaMargem === false ? (
                    <span className={styles.naoCabe}>
                      <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" /> Acima da margem livre
                    </span>
                  ) : null}
                </p>
              ) : null}
              {renderizarSugestao()}
            </>
          ) : null}

          <span className={styles.label}>Categoria</span>
          <SeletorCategoria categorias={categoriasDoTipo} value={categoriaId} onChange={setCategoriaId} />

          <label className={styles.label} htmlFor="descricaoTransacao">
            Descrição
          </label>
          <input
            id="descricaoTransacao"
            type="text"
            className={styles.input}
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
            maxLength={parcelado ? 190 : 200}
            placeholder={parcelado ? 'Ex: Geladeira (cada parcela ganha "(1/10)", "(2/10)"...)' : undefined}
          />
          <span className={styles.contador}>
            {descricao.length}/{parcelado ? 190 : 200} caracteres
          </span>

          <label className={styles.label} htmlFor="dataTransacao">
            {parcelado ? 'Data da 1ª parcela' : 'Data'}
          </label>
          <input
            id="dataTransacao"
            type="date"
            className={styles.input}
            value={data}
            onChange={(event) => setData(event.target.value)}
          />

          {erro ? (
            <p className={styles.errorMessage} aria-live="polite">
              {erro}
            </p>
          ) : null}

          <div className={styles.acoes}>
            <button type="button" className={styles.cancelar} onClick={onCancelar}>
              Cancelar
            </button>
            <button type="submit" className={styles.adicionar} disabled={salvando}>
              {transacaoEmEdicao ? 'Salvar' : parcelado ? 'Parcelar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ModalTransacao
