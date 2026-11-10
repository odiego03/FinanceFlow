import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import SeletorCategoria from './SeletorCategoria'
import { mensagemDeErro } from '../services/api'
import * as parcelamentoService from '../services/parcelamentoService'
import styles from './ModalTransacao.module.css'

const MINIMO_PARCELAS = 2
const MAXIMO_PARCELAS = 60
const PARCELAS_RAPIDAS = [2, 3, 6, 10, 12]

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

function hojeIso() {
  const hoje = new Date()
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
}

function ModalTransacao({ transacaoEmEdicao, categorias, onSalvar, onSalvarParcelamento, onCancelar }) {
  const [tipo, setTipo] = useState(transacaoEmEdicao?.tipo ?? 'DESPESA')
  const [categoriaId, setCategoriaId] = useState(
    transacaoEmEdicao ? String(transacaoEmEdicao.categoriaId) : '',
  )
  const [valor, setValor] = useState(transacaoEmEdicao ? String(transacaoEmEdicao.valor) : '')
  const [descricao, setDescricao] = useState(transacaoEmEdicao?.descricao ?? '')
  const [data, setData] = useState(transacaoEmEdicao?.data ?? hojeIso())
  const [parcelar, setParcelar] = useState(false)
  const [quantidadeParcelas, setQuantidadeParcelas] = useState('2')
  const [sugestao, setSugestao] = useState(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const categoriasDoTipo = useMemo(() => categorias.filter((c) => c.tipo === tipo), [categorias, tipo])
  const podeParcelar = !transacaoEmEdicao && tipo === 'DESPESA'
  const parcelado = podeParcelar && parcelar
  const limiteDescricao = parcelado ? 190 : 200

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

    if (!valor || Number(valor) <= 0) {
      setErro('Informe um valor maior que zero.')
      return
    }
    if (!categoriaId) {
      setErro('Escolha uma categoria.')
      return
    }
    if (parcelado && !descricao.trim()) {
      setErro('Dê um nome para o parcelamento (ex: Geladeira).')
      return
    }
    if (parcelado && !quantidadeValida) {
      setErro(`A quantidade de parcelas deve ser entre ${MINIMO_PARCELAS} e ${MAXIMO_PARCELAS}.`)
      return
    }

    setErro('')
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
          descricao: descricao.trim() || null,
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

  const textoBotao = salvando
    ? 'Salvando...'
    : transacaoEmEdicao
      ? 'Salvar alterações'
      : parcelado
        ? `Parcelar em ${quantidadeValida ? quantidade : '?'}x`
        : tipo === 'RECEITA'
          ? 'Adicionar receita'
          : 'Adicionar despesa'

  return (
    <Modal
      titulo={transacaoEmEdicao ? 'Editar transação' : 'Nova transação'}
      onFechar={onCancelar}
      rodape={
        <>
          <button type="button" className={styles.cancelar} onClick={onCancelar}>
            Cancelar
          </button>
          <button
            type="submit"
            form="form-transacao"
            className={tipo === 'RECEITA' ? styles.salvarReceita : styles.salvarDespesa}
            disabled={salvando}
          >
            {textoBotao}
          </button>
        </>
      }
    >
      <form id="form-transacao" className={styles.formulario} onSubmit={handleSubmit} noValidate>
        <div className={styles.tipos} role="radiogroup" aria-label="Tipo">
          <button
            type="button"
            role="radio"
            aria-checked={tipo === 'RECEITA'}
            className={tipo === 'RECEITA' ? styles.tipoReceitaAtivo : styles.tipo}
            onClick={() => trocarTipo('RECEITA')}
          >
            <i className="bi bi-arrow-down-circle" aria-hidden="true" /> Receita
            <small>Dinheiro que entrou</small>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={tipo === 'DESPESA'}
            className={tipo === 'DESPESA' ? styles.tipoDespesaAtivo : styles.tipo}
            onClick={() => trocarTipo('DESPESA')}
          >
            <i className="bi bi-arrow-up-circle" aria-hidden="true" /> Despesa
            <small>Dinheiro que saiu</small>
          </button>
        </div>

        <div className={styles.linha}>
          <label className={styles.campo}>
            <span>{parcelado ? 'Valor total da compra' : 'Valor'}</span>
            <div className={styles.campoValor}>
              <span aria-hidden="true">R$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                placeholder="0,00"
                value={valor}
                onChange={(event) => setValor(event.target.value)}
                data-autofoco
              />
            </div>
          </label>
          <label className={styles.campo}>
            <span>{parcelado ? 'Data da 1ª parcela' : 'Data'}</span>
            <input type="date" className={styles.input} value={data} onChange={(event) => setData(event.target.value)} />
          </label>
        </div>

        {podeParcelar ? (
          <div className={`${styles.parcelamento} ${parcelado ? styles.parcelamentoAberto : ''}`}>
            <label className={styles.interruptor}>
              <input type="checkbox" checked={parcelar} onChange={(event) => setParcelar(event.target.checked)} />
              <span className={styles.trilho} aria-hidden="true" />
              <span className={styles.interruptorTexto}>
                <strong>
                  <i className="bi bi-credit-card" aria-hidden="true" /> Parcelar esta compra
                </strong>
                <small>Divide o valor em parcelas mensais, lançadas automaticamente</small>
              </span>
            </label>

            {parcelado ? (
              <>
                <div className={styles.parcelas} role="group" aria-label="Quantidade de parcelas">
                  {PARCELAS_RAPIDAS.map((opcao) => (
                    <button
                      key={opcao}
                      type="button"
                      aria-pressed={quantidade === opcao}
                      className={quantidade === opcao ? styles.parcelaAtiva : styles.parcela}
                      onClick={() => setQuantidadeParcelas(String(opcao))}
                    >
                      {opcao}x
                    </button>
                  ))}
                  <label className={styles.outraQuantidade}>
                    <span>Outra:</span>
                    <input
                      type="number"
                      step="1"
                      min={MINIMO_PARCELAS}
                      max={MAXIMO_PARCELAS}
                      value={quantidadeParcelas}
                      onChange={(event) => setQuantidadeParcelas(event.target.value)}
                      aria-label="Quantidade de parcelas"
                    />
                  </label>
                </div>
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
                ) : (
                  <p className={styles.dicaParcela}>Informe o valor total para ver quanto fica cada parcela.</p>
                )}
                {renderizarSugestao()}
              </>
            ) : null}
          </div>
        ) : null}

        <label className={styles.campo}>
          <span>
            {parcelado ? 'O que você comprou' : 'Descrição'}
            {!parcelado ? <em> (opcional)</em> : null}
          </span>
          <input
            type="text"
            className={styles.input}
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
            maxLength={limiteDescricao}
            placeholder={parcelado ? 'Ex: Geladeira' : tipo === 'RECEITA' ? 'Ex: Salário de outubro' : 'Ex: Mercado do mês'}
          />
          {descricao.length > limiteDescricao - 30 ? (
            <small className={styles.contador}>
              {descricao.length}/{limiteDescricao} caracteres
            </small>
          ) : null}
        </label>

        <div className={styles.campo}>
          <span>Categoria</span>
          <SeletorCategoria categorias={categoriasDoTipo} value={categoriaId} onChange={setCategoriaId} compacto />
        </div>

        {erro ? (
          <p className={styles.erro} role="alert">
            <i className="bi bi-exclamation-circle" aria-hidden="true" /> {erro}
          </p>
        ) : null}
      </form>
    </Modal>
  )
}

export default ModalTransacao
