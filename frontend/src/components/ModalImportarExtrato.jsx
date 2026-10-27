import { useMemo, useState } from 'react'
import * as transacaoService from '../services/transacaoService'
import { agruparReceitasPorMeta } from '../utils/agruparReceitasPorMeta'
import { resumirDescricao } from '../utils/descricao'
import DestinarMetasImportacao from './DestinarMetasImportacao'
import Modal from './Modal'
import styles from './ModalImportarExtrato.module.css'

const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const formatadorData = new Intl.DateTimeFormat('pt-BR')

const BANCOS = [
  { valor: 'NUBANK', texto: 'Nubank', sigla: 'Nu', cor: '#820ad1' },
  { valor: 'ITAU', texto: 'Itaú', sigla: 'It', cor: '#ec7000' },
]

const ETAPAS = [
  { valor: 'upload', texto: 'Arquivo' },
  { valor: 'revisao', texto: 'Revisão' },
  { valor: 'metas', texto: 'Metas' },
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
  const [arrastando, setArrastando] = useState(false)

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

  const escolherArquivo = (escolhido) => {
    setArquivo(escolhido ?? null)
    setErro('')
  }

  const soltarArquivo = (event) => {
    event.preventDefault()
    setArrastando(false)
    escolherArquivo(event.dataTransfer.files[0])
  }

  const indiceEtapa = ETAPAS.findIndex((item) => item.valor === etapa)

  const rodape =
    etapa === 'upload' ? (
      <>
        <button type="button" className={styles.cancelar} onClick={onCancelar}>
          Cancelar
        </button>
        <button type="submit" form="form-importar" className={styles.confirmar} disabled={carregando}>
          {carregando ? 'Analisando...' : 'Analisar extrato'}
        </button>
      </>
    ) : etapa === 'revisao' ? (
      <>
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
          {carregando ? 'Importando...' : `Importar ${linhasIncluidas.length} lançamento(s)`}
        </button>
      </>
    ) : null

  return (
    <Modal
      titulo={etapa === 'metas' ? `${resultadoImportacao.quantidade} transação(ões) importada(s)` : 'Importar extrato'}
      subtitulo={
        etapa === 'metas'
          ? 'Quer destinar alguma dessas receitas às suas metas?'
          : 'Traga os lançamentos do banco de uma vez, sem digitar um por um.'
      }
      largo={etapa !== 'upload'}
      // Na etapa de metas as transações já existem: fechar perderia o aviso de sucesso
      podeFechar={etapa !== 'metas'}
      onFechar={onCancelar}
      rodape={rodape}
    >
      <ol className={styles.etapas}>
        {ETAPAS.map((item, posicao) => (
          <li
            key={item.valor}
            className={posicao === indiceEtapa ? styles.etapaAtual : posicao < indiceEtapa ? styles.etapaFeita : styles.etapa}
          >
            <span className={styles.etapaNumero}>
              {posicao < indiceEtapa ? <i className="bi bi-check-lg" aria-hidden="true" /> : posicao + 1}
            </span>
            {item.texto}
          </li>
        ))}
      </ol>

      {etapa === 'metas' ? (
        <DestinarMetasImportacao
          grupos={resultadoImportacao.grupos}
          onConcluir={(totalDestinado) => onConcluir(resultadoImportacao.quantidade, totalDestinado)}
        />
      ) : etapa === 'upload' ? (
        <form id="form-importar" className={styles.formularioUpload} onSubmit={handleAnalisar}>
          <div className={styles.grupoCampo}>
            <span className={styles.label}>De qual banco é o extrato?</span>
            <div className={styles.bancoGroup} role="radiogroup" aria-label="Banco">
              {BANCOS.map((opcao) => (
                <button
                  key={opcao.valor}
                  type="button"
                  role="radio"
                  aria-checked={banco === opcao.valor}
                  className={`${styles.bancoBotao} ${banco === opcao.valor ? styles.bancoBotaoAtivo : ''}`}
                  onClick={() => setBanco(opcao.valor)}
                >
                  <span className={styles.bancoSigla} style={{ background: opcao.cor }} aria-hidden="true">
                    {opcao.sigla}
                  </span>
                  <span>
                    {opcao.texto}
                    <small>Extrato da conta em CSV</small>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.grupoCampo}>
            <span className={styles.label}>Arquivo</span>
            <label
              className={`${styles.areaArquivo} ${arrastando ? styles.areaArquivoAtiva : ''} ${arquivo ? styles.areaArquivoPreenchida : ''}`}
              onDragOver={(event) => {
                event.preventDefault()
                setArrastando(true)
              }}
              onDragLeave={() => setArrastando(false)}
              onDrop={soltarArquivo}
            >
              <input
                type="file"
                accept=".csv"
                className={styles.inputArquivo}
                onChange={(event) => escolherArquivo(event.target.files[0])}
              />
              {arquivo ? (
                <>
                  <i className="bi bi-file-earmark-check" aria-hidden="true" />
                  <strong>{arquivo.name}</strong>
                  <small>{(arquivo.size / 1024).toFixed(1)} KB · clique para trocar</small>
                </>
              ) : (
                <>
                  <i className="bi bi-cloud-arrow-up" aria-hidden="true" />
                  <strong>Arraste o arquivo CSV aqui</strong>
                  <small>ou clique para escolher no computador</small>
                </>
              )}
            </label>
            <span className={styles.ajuda}>
              <i className="bi bi-shield-check" aria-hidden="true" /> O arquivo é lido só para gerar as transações e não
              fica guardado. Nada é gravado antes de você revisar.
            </span>
          </div>

          {erro ? (
            <p className={styles.errorMessage} role="alert">
              {erro}
            </p>
          ) : null}
        </form>
      ) : (
        <div className={styles.revisao}>
          <p className={styles.resumoRevisao}>
            {quantidadePendentes > 0 ? (
              <span className={styles.resumoPendente}>
                <i className="bi bi-exclamation-circle" aria-hidden="true" /> {quantidadePendentes} sem categoria — escolha
                para poder importar todas.
              </span>
            ) : (
              <span className={styles.resumoOk}>
                <i className="bi bi-check-circle" aria-hidden="true" /> Todos os lançamentos marcados têm categoria.
              </span>
            )}
            {quantidadeSugeridas > 0 ? (
              <span> {quantidadeSugeridas} com categoria sugerida pela descrição: confira antes de importar.</span>
            ) : null}
            <span> Escolher a categoria de um favorecido preenche as outras linhas dele.</span>
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
              linhasVisiveis.map(({ linha, indice }) => {
                const resumo = resumirDescricao(linha.descricao)
                return (
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
                    <div className={styles.descricao} title={linha.descricao}>
                      <strong>{resumo.titulo}</strong>
                      {resumo.detalhe ? <small>{resumo.detalhe}</small> : null}
                    </div>
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
                )
              })
            )}
          </div>

          {erro ? (
            <p className={styles.errorMessage} role="alert">
              {erro}
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  )
}

export default ModalImportarExtrato
