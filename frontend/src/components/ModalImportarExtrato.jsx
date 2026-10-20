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
  const quantidadePendentes = linhasIncluidas.filter((linha) => !linha.categoriaId).length
  const quantidadeSugeridas = linhasIncluidas.filter((linha) => linha.origem === 'PALAVRA_CHAVE').length
  const podeConfirmar = linhasIncluidas.length > 0 && linhasIncluidas.every((linha) => linha.categoriaId)

  const handleConfirmar = async () => {
    setErro('')
    setCarregando(true)
    try {
      const payload = linhasIncluidas.map((linha) => ({
        data: linha.data,
        descricao: linha.descricao,
        valor: linha.valor,
        tipo: linha.tipo,
        categoriaId: Number(linha.categoriaId),
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
            <div className={styles.tabelaWrapper}>
              <table className={styles.tabela}>
                <thead>
                  <tr>
                    <th>Incluir</th>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Valor</th>
                    <th>Categoria</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((linha, indice) => (
                    <tr key={`${linha.data}-${linha.descricao}-${indice}`}>
                      <td>
                        <input
                          type="checkbox"
                          checked={linha.incluida}
                          onChange={(event) => alterarLinha(indice, { incluida: event.target.checked })}
                        />
                      </td>
                      <td>{formatadorData.format(new Date(`${linha.data}T00:00:00`))}</td>
                      <td>{linha.descricao}</td>
                      <td className={linha.tipo === 'RECEITA' ? styles.valorPositivo : styles.valorNegativo}>
                        {formatadorMoeda.format(linha.valor)}
                      </td>
                      <td>
                        <select
                          className={styles.selectCategoria}
                          value={linha.categoriaId}
                          disabled={!linha.incluida}
                          onChange={(event) => alterarCategoria(indice, event.target.value)}
                        >
                          <option value="">Selecione</option>
                          {categoriasPorTipo[linha.tipo].map((categoria) => (
                            <option key={categoria.id} value={categoria.id}>
                              {categoria.nome}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <BadgeStatus linha={linha} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              <button
                type="button"
                className={styles.confirmar}
                disabled={!podeConfirmar || carregando}
                onClick={handleConfirmar}
              >
                {carregando
                  ? 'Importando...'
                  : `Confirmar importação (${linhasIncluidas.length})`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ModalImportarExtrato
