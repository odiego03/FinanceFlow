import { useMemo, useState } from 'react'
import * as transacaoService from '../services/transacaoService'
import styles from './ModalImportarExtrato.module.css'

const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const formatadorData = new Intl.DateTimeFormat('pt-BR')

const BANCOS = [
  { valor: 'NUBANK', texto: 'Nubank' },
  { valor: 'ITAU', texto: 'Itaú' },
]

function ModalImportarExtrato({ categorias, onConcluir, onCancelar }) {
  const [etapa, setEtapa] = useState('upload')
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

  const linhasIncluidas = linhas.filter((linha) => linha.incluida)
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
      onConcluir(resultado.transacoesCriadas)
    } catch (erroRequisicao) {
      setErro(erroRequisicao.response?.data?.mensagem || 'Não foi possível confirmar a importação.')
      setCarregando(false)
    }
  }

  return (
    <div className={styles.backdrop} onClick={onCancelar}>
      <div
        className={`${styles.modal} ${etapa === 'revisao' ? styles.modalLargo : ''}`}
        onClick={(event) => event.stopPropagation()}
      >
        <h2>Importar extrato</h2>

        {etapa === 'upload' ? (
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
                          onChange={(event) => alterarLinha(indice, { categoriaId: event.target.value })}
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
                        {linha.duplicada ? (
                          <span className={styles.badgeDuplicada}>Duplicada</span>
                        ) : linha.categoriaIdSugerida ? (
                          <span className={styles.badgeAutomatica}>Automática</span>
                        ) : (
                          <span className={styles.badgePendente}>Pendente</span>
                        )}
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
