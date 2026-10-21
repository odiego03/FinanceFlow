import { useMemo, useState } from 'react'
import * as transacaoService from '../services/transacaoService'
import { agruparReceitasPorMeta } from '../utils/agruparReceitasPorMeta'
import DestinarMetasImportacao from './DestinarMetasImportacao'
import styles from './ModalImportarExtrato.module.css'

const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const formatadorData = new Intl.DateTimeFormat('pt-BR')

const BANCOS = [
  { valor: 'NUBANK', texto: 'Nubank' },
  { valor: 'ITAU', texto: 'Itaú' },
]

const FILTROS_REVISAO = [
  { valor: 'TODAS', texto: 'Todas', aceita: () => true },
  { valor: 'PENDENTES', texto: 'Pendentes', aceita: (linha) => linha.incluida && !linha.categoriaId },
  { valor: 'PREENCHIDAS', texto: 'Preenchidas', aceita: (linha) => Boolean(linha.categoriaId) },
  { valor: 'DUPLICADAS', texto: 'Duplicadas', aceita: (linha) => linha.duplicada },
]

const BADGES_POR_ORIGEM = {
  APRENDIDA: { classe: 'badgeAutomatica', texto: 'Aprendida', dica: 'Mesma categoria que você escolheu numa importação anterior' },
  MESMO_FAVORECIDO: { classe: 'badgeAutomatica', texto: 'Mesmo favorecido', dica: 'Copiada de outra linha deste extrato com o mesmo favorecido' },
  PALAVRA_CHAVE: { classe: 'badgeSugerida', texto: 'Sugerida', dica: 'Sugerida pela descrição — confira' },
  MANUAL: { classe: 'badgeManual', texto: 'Manual', dica: 'Escolhida por você' },
}

function BadgeStatus({ linha }) {
  if (linha.duplicada && !linha.incluida) {
    return <span className={styles.badgeDuplicada}>Duplicada</span>
  }
  if (!linha.categoriaId) {
    return <span className={styles.badgePendente}>Pendente</span>
  }
  const badge = BADGES_POR_ORIGEM[linha.origem] ?? BADGES_POR_ORIGEM.MANUAL
  return (
    <span className={styles[badge.classe]} title={badge.dica}>
      {badge.texto}
    </span>
  )
}

function ModalImportarExtrato({ categorias, metas, onConcluir, onCancelar }) {
  const [etapa, setEtapa] = useState('upload')
  const [resultadoImportacao, setResultadoImportacao] = useState(null)
  const [filtroRevisao, setFiltroRevisao] = useState('TODAS')
  const [banco, setBanco] = useState('NUBANK')
  const [arquivo, setArquivo] = useState(null)
  const [linhas, setLinhas] = useState([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const categoriasPorTipo = useMemo(() => {
    const mapa = { RECEITA: [], DESPESA: [] }
    categorias.forEach((categoria) => mapa[categoria.tipo]?.push(categoria))
    return mapa
  }, [categorias])

  const handleAnalisar = async (event) => {
    event.preventDefault()
    if (!arquivo) {
      setErro('Selecione um arquivo CSV.')
      return
    }

    setErro('')
    setCarregando(true)
    try {
      const resposta = await transacaoService.importarPreview(banco, arquivo)
      setLinhas(
        resposta.map((linha) => ({
          ...linha,
          categoriaId: linha.categoriaIdSugerida ? String(linha.categoriaIdSugerida) : '',
          origem: linha.origemSugestao,
          incluida: !linha.duplicada,
        })),
      )
      setEtapa('revisao')
    } catch (erroRequisicao) {
      setErro(erroRequisicao.response?.data?.mensagem || 'Não foi possível ler o arquivo enviado.')
    } finally {
      setCarregando(false)
    }
  }

  const alterarLinha = (indice, campos) => {
    setLinhas((atual) => atual.map((linha, i) => (i === indice ? { ...linha, ...campos } : linha)))
  }

  // Escolher a categoria de uma linha preenche as outras linhas pendentes do mesmo favorecido (mesma chave e tipo)
  const alterarCategoria = (indice, categoriaId) => {
    setLinhas((atual) => {
      const alterada = atual[indice]
      return atual.map((linha, i) => {
        if (i === indice) {
          return { ...linha, categoriaId, origem: categoriaId ? 'MANUAL' : null }
        }
        const mesmoFavorecido = linha.chave === alterada.chave && linha.tipo === alterada.tipo
        if (categoriaId && mesmoFavorecido && !linha.categoriaId) {
          return { ...linha, categoriaId, origem: 'MESMO_FAVORECIDO' }
        }
        return linha
      })
    })
  }

  const linhasIncluidas = linhas.filter((linha) => linha.incluida)
  const linhasCategorizadas = linhasIncluidas.filter((linha) => linha.categoriaId)
  const quantidadePendentes = linhasIncluidas.length - linhasCategorizadas.length
  const quantidadeSugeridas = linhasIncluidas.filter((linha) => linha.origem === 'PALAVRA_CHAVE').length
  const podeConfirmar = linhasIncluidas.length > 0 && quantidadePendentes === 0

  const contagemPorFiltro = Object.fromEntries(
    FILTROS_REVISAO.map((opcao) => [opcao.valor, linhas.filter(opcao.aceita).length]),
  )
  const filtroAtual = FILTROS_REVISAO.find((opcao) => opcao.valor === filtroRevisao)
  // Guarda o índice original: alterarLinha/alterarCategoria trabalham sobre a lista completa
  const linhasVisiveis = linhas
    .map((linha, indice) => ({ linha, indice }))
    .filter(({ linha }) => filtroAtual.aceita(linha))
  const todasVisiveisMarcadas = linhasVisiveis.length > 0 && linhasVisiveis.every(({ linha }) => linha.incluida)

  const marcarVisiveis = (incluida) => {
    const indicesVisiveis = new Set(linhasVisiveis.map(({ indice }) => indice))
    setLinhas((atual) => atual.map((linha, i) => (indicesVisiveis.has(i) ? { ...linha, incluida } : linha)))
  }

  const handleConfirmar = async (linhasParaImportar) => {
    setErro('')
    setCarregando(true)
    try {
      const payload = linhasParaImportar.map((linha) => ({
        data: linha.data,
        descricao: linha.descricao,
        valor: linha.valor,
        tipo: linha.tipo,
        categoriaId: Number(linha.categoriaId),
        identificador: linha.identificador,
      }))
      const resultado = await transacaoService.importarConfirmar(payload)
      const grupos = agruparReceitasPorMeta(resultado.transacoes, metas)
      if (grupos.length === 0) {
        onConcluir(resultado.transacoesCriadas, 0)
        return
      }
      setResultadoImportacao({ quantidade: resultado.transacoesCriadas, grupos })
      setEtapa('metas')
      setCarregando(false)
    } catch (erroRequisicao) {
      setErro(erroRequisicao.response?.data?.mensagem || 'Não foi possível confirmar a importação.')
      setCarregando(false)
    }
  }

  // Na etapa de metas as transações já existem: fechar pelo fundo perderia o aviso de sucesso, então não fecha
  const fecharPeloFundo = etapa === 'metas' ? undefined : onCancelar

  return (
    <div className={styles.backdrop} onClick={fecharPeloFundo}>
      <div
        className={`${styles.modal} ${etapa !== 'upload' ? styles.modalLargo : ''}`}
        onClick={(event) => event.stopPropagation()}
      >
        <h2>{etapa === 'metas' ? `${resultadoImportacao.quantidade} transação(ões) importada(s) — destinar às metas?` : 'Importar extrato'}</h2>

        {etapa === 'metas' ? (
          <DestinarMetasImportacao
            grupos={resultadoImportacao.grupos}
            onConcluir={(totalDestinado) => onConcluir(resultadoImportacao.quantidade, totalDestinado)}
          />
        ) : etapa === 'upload' ? (
          <form onSubmit={handleAnalisar}>
            <span className={styles.label}>Banco</span>
            <div className={styles.bancoGroup}>
              {BANCOS.map((opcao) => (
                <button
                  key={opcao.valor}
                  type="button"
                  className={`${styles.bancoBotao} ${banco === opcao.valor ? styles.bancoBotaoAtivo : ''}`}
                  onClick={() => setBanco(opcao.valor)}
                >
                  {opcao.texto}
                </button>
              ))}
            </div>

            <label className={styles.label} htmlFor="arquivoExtrato">
              Arquivo CSV
            </label>
            <input
              id="arquivoExtrato"
              type="file"
              accept=".csv"
              className={styles.input}
              onChange={(event) => setArquivo(event.target.files[0] ?? null)}
            />
            <span className={styles.ajuda}>
              O arquivo é lido só pra gerar as transações — não fica guardado no sistema.
            </span>

            {erro ? (
              <p className={styles.errorMessage} aria-live="polite">
                {erro}
              </p>
            ) : null}

            <div className={styles.acoes}>
              <button type="button" className={styles.cancelar} onClick={onCancelar}>
                Cancelar
              </button>
              <button type="submit" className={styles.confirmar} disabled={carregando}>
                {carregando ? 'Analisando...' : 'Analisar'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className={styles.ajuda}>
              {quantidadePendentes > 0
                ? `${quantidadePendentes} lançamento(s) pendente(s) de categoria. `
                : 'Todos os lançamentos incluídos têm categoria. '}
              {quantidadeSugeridas > 0
                ? `${quantidadeSugeridas} com categoria sugerida pela descrição — confira antes de confirmar.`
                : ''}
            </p>
            <div className={styles.barraRevisao}>
              <div className={styles.filtrosRevisao} role="group" aria-label="Filtrar lançamentos">
                {FILTROS_REVISAO.map((opcao) => (
                  <button
                    key={opcao.valor}
                    type="button"
                    aria-pressed={filtroRevisao === opcao.valor}
                    className={`${styles.chipFiltro} ${filtroRevisao === opcao.valor ? styles.chipFiltroAtivo : ''}`}
                    onClick={() => setFiltroRevisao(opcao.valor)}
                  >
                    {opcao.texto} <span className={styles.contagem}>{contagemPorFiltro[opcao.valor]}</span>
                  </button>
                ))}
              </div>
              <label className={styles.marcarTodas}>
                <input
                  type="checkbox"
                  checked={todasVisiveisMarcadas}
                  onChange={(event) => marcarVisiveis(event.target.checked)}
                  disabled={linhasVisiveis.length === 0}
                />
                Marcar todas
              </label>
            </div>

            <div className={styles.lista} role="list">
              <div className={styles.cabecalhoLista} aria-hidden="true">
                <span />
                <span>Data / Valor</span>
                <span>Descrição</span>
                <span>Categoria</span>
                <span>Status</span>
              </div>

              {linhasVisiveis.length === 0 ? (
                <p className={styles.listaVazia}>Nenhum lançamento neste filtro.</p>
              ) : (
                linhasVisiveis.map(({ linha, indice }) => (
                  <div
                    key={`${linha.data}-${linha.descricao}-${indice}`}
                    role="listitem"
                    className={`${styles.linha} ${linha.incluida ? '' : styles.linhaExcluida}`}
                  >
                    <input
                      type="checkbox"
                      className={styles.checkLinha}
                      checked={linha.incluida}
                      onChange={(event) => alterarLinha(indice, { incluida: event.target.checked })}
                      aria-label={`Incluir ${linha.descricao}`}
                    />
                    <div className={styles.dataValor}>
                      <span className={styles.data}>{formatadorData.format(new Date(`${linha.data}T00:00:00`))}</span>
                      <strong className={linha.tipo === 'RECEITA' ? styles.valorPositivo : styles.valorNegativo}>
                        {linha.tipo === 'RECEITA' ? '+ ' : '- '}
                        {formatadorMoeda.format(linha.valor)}
                      </strong>
                    </div>
                    <p className={styles.descricao} title={linha.descricao}>
                      {linha.descricao}
                    </p>
                    <select
                      className={styles.selectCategoria}
                      value={linha.categoriaId}
                      disabled={!linha.incluida}
                      onChange={(event) => alterarCategoria(indice, event.target.value)}
                      aria-label="Categoria"
                    >
                      <option value="">Selecione</option>
                      {categoriasPorTipo[linha.tipo].map((categoria) => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.nome}
                        </option>
                      ))}
                    </select>
                    <div className={styles.status}>
                      <BadgeStatus linha={linha} />
                    </div>
                  </div>
                ))
              )}
            </div>

            {erro ? (
              <p className={styles.errorMessage} aria-live="polite">
                {erro}
              </p>
            ) : null}

            <div className={styles.acoes}>
              <button type="button" className={styles.cancelar} onClick={onCancelar}>
                Cancelar
              </button>
              {quantidadePendentes > 0 && linhasCategorizadas.length > 0 ? (
                <button
                  type="button"
                  className={styles.confirmarParcial}
                  disabled={carregando}
                  onClick={() => handleConfirmar(linhasCategorizadas)}
                  title="As pendentes ficam de fora — dá pra importar o mesmo arquivo de novo depois"
                >
                  Importar só as categorizadas ({linhasCategorizadas.length})
                </button>
              ) : null}
              <button
                type="button"
                className={styles.confirmar}
                disabled={!podeConfirmar || carregando}
                onClick={() => handleConfirmar(linhasIncluidas)}
                title={podeConfirmar ? undefined : 'Escolha a categoria das pendentes, ou use "Importar só as categorizadas"'}
              >
                {carregando
                  ? 'Importando...'
                  : `Importar todas (${linhasIncluidas.length})`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ModalImportarExtrato
