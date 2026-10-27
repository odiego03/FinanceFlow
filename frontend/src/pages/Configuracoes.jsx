import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PREFERENCIAS_PADRAO, usePreferencias } from '../contexts/PreferenciasContext'
import { mensagemDeErro } from '../services/api'
import * as categoriaService from '../services/categoriaService'
import * as exclusaoService from '../services/exclusaoService'
import * as transacaoService from '../services/transacaoService'
import * as usuarioService from '../services/usuarioService'
import { baixarCsv, CABECALHO_TRANSACOES, linhasDeTransacoes } from '../utils/csv'
import styles from './Configuracoes.module.css'

// Na exclusão os valores aparecem mesmo com "ocultar valores" ligado: quem vai apagar precisa ver o que apaga
const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const formatadorData = new Intl.DateTimeFormat('pt-BR')

const PALAVRA_CONFIRMACAO = 'EXCLUIR'

const opcoesTema = [
  { valor: 'CLARO', texto: 'Claro', icone: 'sun' },
  { valor: 'ESCURO', texto: 'Escuro', icone: 'moon-stars' },
  { valor: 'SISTEMA', texto: 'Automático', icone: 'circle-half' },
]

const opcoesPeriodo = [
  { valor: 'ESTE_MES', texto: 'Este mês' },
  { valor: 'MES_PASSADO', texto: 'Mês passado' },
  { valor: 'ESTE_ANO', texto: 'Este ano' },
  { valor: 'ANO_PASSADO', texto: 'Ano passado' },
  { valor: 'PERSONALIZADO', texto: 'Personalizado...' },
  { valor: 'TUDO', texto: 'Todo o histórico' },
]

function dataIso(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
}

// [inicio, fim] em AAAA-MM-DD; '' = sem limite daquele lado
function intervaloDoPeriodo(periodo, dataInicio, dataFim) {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()
  switch (periodo) {
    case 'ESTE_MES':
      return [dataIso(new Date(ano, mes, 1)), dataIso(new Date(ano, mes + 1, 0))]
    case 'MES_PASSADO':
      return [dataIso(new Date(ano, mes - 1, 1)), dataIso(new Date(ano, mes, 0))]
    case 'ESTE_ANO':
      return [`${ano}-01-01`, `${ano}-12-31`]
    case 'ANO_PASSADO':
      return [`${ano - 1}-01-01`, `${ano - 1}-12-31`]
    case 'PERSONALIZADO':
      return [dataInicio, dataFim]
    default:
      return ['', '']
  }
}

function descreverIntervalo([inicio, fim]) {
  const formatar = (iso) => formatadorData.format(new Date(`${iso}T00:00:00`))
  if (!inicio && !fim) return 'todo o histórico'
  if (!inicio) return `até ${formatar(fim)}`
  if (!fim) return `a partir de ${formatar(inicio)}`
  return `de ${formatar(inicio)} a ${formatar(fim)}`
}

function Aviso({ tipo, children }) {
  if (!children) return null
  return (
    <p className={tipo === 'erro' ? styles.erro : styles.sucesso} aria-live="polite">
      {children}
    </p>
  )
}

function SecaoConta() {
  const { usuario, atualizarUsuario } = useAuth()
  const [nome, setNome] = useState(usuario?.nome ?? '')
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (usuario) setNome(usuario.nome)
  }, [usuario])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!nome.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe seu nome.' })
      return
    }
    setSalvando(true)
    try {
      atualizarUsuario(await usuarioService.atualizarNome(nome.trim()))
      setMensagem({ tipo: 'sucesso', texto: 'Nome atualizado.' })
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: mensagemDeErro(erro, 'Não foi possível salvar o nome.') })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <section className={styles.secao}>
      <h2>Dados da conta</h2>
      <form onSubmit={handleSubmit} className={styles.formulario}>
        <label className={styles.campo}>
          <span>Nome</span>
          <input type="text" value={nome} maxLength={100} onChange={(event) => setNome(event.target.value)} />
        </label>
        <label className={styles.campo}>
          <span>E-mail</span>
          <input type="email" value={usuario?.email ?? ''} disabled />
          <small>O e-mail é o seu login e não pode ser alterado.</small>
        </label>
        {usuario?.criadoEm ? (
          <p className={styles.descricao}>
            Conta criada em {formatadorData.format(new Date(usuario.criadoEm))}.
          </p>
        ) : null}
        <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso>
        <div className={styles.acoes}>
          <button type="submit" className={styles.botaoPrimario} disabled={salvando || nome.trim() === usuario?.nome}>
            Salvar nome
          </button>
        </div>
      </form>
    </section>
  )
}

function SecaoSenha() {
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' })
  const [salvando, setSalvando] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (novaSenha.length < 6) {
      setMensagem({ tipo: 'erro', texto: 'A nova senha precisa ter pelo menos 6 caracteres.' })
      return
    }
    if (novaSenha !== confirmacao) {
      setMensagem({ tipo: 'erro', texto: 'A confirmação não bate com a nova senha.' })
      return
    }
    setSalvando(true)
    try {
      await usuarioService.trocarSenha(senhaAtual, novaSenha)
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmacao('')
      setMensagem({ tipo: 'sucesso', texto: 'Senha alterada. Use a nova senha no próximo login.' })
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: mensagemDeErro(erro, 'Não foi possível trocar a senha.') })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <section className={styles.secao}>
      <h2>Trocar senha</h2>
      <form onSubmit={handleSubmit} className={styles.formulario}>
        <label className={styles.campo}>
          <span>Senha atual</span>
          <input
            type="password"
            autoComplete="current-password"
            value={senhaAtual}
            onChange={(event) => setSenhaAtual(event.target.value)}
          />
        </label>
        <label className={styles.campo}>
          <span>Nova senha</span>
          <input
            type="password"
            autoComplete="new-password"
            value={novaSenha}
            onChange={(event) => setNovaSenha(event.target.value)}
          />
          <small>Pelo menos 6 caracteres.</small>
        </label>
        <label className={styles.campo}>
          <span>Confirme a nova senha</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirmacao}
            onChange={(event) => setConfirmacao(event.target.value)}
          />
        </label>
        <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso>
        <div className={styles.acoes}>
          <button type="submit" className={styles.botaoPrimario} disabled={salvando || !senhaAtual || !novaSenha}>
            Trocar senha
          </button>
        </div>
      </form>
    </section>
  )
}

// Tema e "ocultar valores" valem na hora, sem botão de salvar: cada clique já grava na conta
function SecaoAparencia() {
  const { preferencias, salvar, ocultarValores, alternarOcultarValores } = usePreferencias()
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' })

  const trocarTema = async (tema) => {
    setMensagem({ tipo: '', texto: '' })
    try {
      await salvar({ ...preferencias, tema })
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: mensagemDeErro(erro, 'Não foi possível trocar o tema.') })
    }
  }

  return (
    <>
      <section className={styles.secao}>
        <h2>Tema</h2>
        <p className={styles.descricao}>Muda na hora e fica salvo na sua conta.</p>
        <div className={styles.segmentado} role="radiogroup" aria-label="Tema">
          {opcoesTema.map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              role="radio"
              aria-checked={preferencias.tema === opcao.valor}
              className={preferencias.tema === opcao.valor ? styles.segmentoAtivo : ''}
              onClick={() => trocarTema(opcao.valor)}
            >
              <i className={`bi bi-${opcao.icone}`} aria-hidden="true" /> {opcao.texto}
            </button>
          ))}
        </div>
        <small className={styles.descricao}>Automático segue o modo claro ou escuro do seu sistema operacional.</small>
        <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso>
      </section>

      <section className={styles.secao}>
        <h2>Privacidade</h2>
        <label className={styles.alternador}>
          <input type="checkbox" checked={ocultarValores} onChange={alternarOcultarValores} />
          <span>
            Ocultar valores em R$
            <small>
              Dashboard, Transações e Metas mostram "R$ •••••". Útil quando alguém está olhando a tela. Também dá pra
              alternar pelo olho na barra superior.
            </small>
          </span>
        </label>
      </section>
    </>
  )
}

function SecaoFinancas() {
  const { preferencias, salvar } = usePreferencias()
  const [rascunho, setRascunho] = useState(preferencias)
  const [editado, setEditado] = useState(false)
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' })
  const [salvando, setSalvando] = useState(false)

  // Acompanha o que chega de fora (carregamento) sem apagar o que o usuário está editando
  useEffect(() => {
    if (!editado) setRascunho(preferencias)
  }, [preferencias, editado])

  const alterar = (campo, valor) => {
    setEditado(true)
    setRascunho((atual) => ({ ...atual, [campo]: valor }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    // Parte do que já está salvo (tema, ocultar valores) e troca só os campos desta aba
    const novas = {
      ...preferencias,
      limiteEssencial: Number(rascunho.limiteEssencial),
      limiteTotal: Number(rascunho.limiteTotal),
      simuladorPercentualCdi: Number(rascunho.simuladorPercentualCdi),
      simuladorPrazoMeses: Number(rascunho.simuladorPrazoMeses),
    }
    if (novas.limiteEssencial >= novas.limiteTotal) {
      setMensagem({ tipo: 'erro', texto: 'O limite das essenciais precisa ser menor que o do total de despesas.' })
      return
    }
    setSalvando(true)
    try {
      await salvar(novas)
      setEditado(false)
      setMensagem({ tipo: 'sucesso', texto: 'Configurações salvas.' })
    } catch (erro) {
      const dados = erro?.response?.data
      // Erro de validação de campo vem como {campo: mensagem}, sem "mensagem"
      const primeiroErroDeCampo = dados && !dados.mensagem ? Object.values(dados)[0] : null
      setMensagem({
        tipo: 'erro',
        texto: primeiroErroDeCampo || mensagemDeErro(erro, 'Não foi possível salvar as configurações.'),
      })
    } finally {
      setSalvando(false)
    }
  }

  const restaurarLimites = () => {
    setEditado(true)
    setRascunho((atual) => ({
      ...atual,
      limiteEssencial: PREFERENCIAS_PADRAO.limiteEssencial,
      limiteTotal: PREFERENCIAS_PADRAO.limiteTotal,
    }))
  }

  return (
    <section className={styles.secao}>
      <h2>Alertas e simulador</h2>
      <p className={styles.descricao}>Ficam salvos na sua conta e valem em qualquer computador em que você entrar.</p>
      <form onSubmit={handleSubmit} className={styles.formulario}>
        <fieldset className={styles.grupo}>
          <legend>Alerta de comprometimento de renda</legend>
          <p className={styles.descricao}>
            O padrão segue a regra 50/30/20: atenção quando as despesas essenciais chegam a 50% da renda, risco quando o
            total chega a 80%. O Dashboard e as sugestões usam os seus limites.
          </p>
          <div className={styles.linha}>
            <label className={styles.campo}>
              <span>Atenção: essenciais a partir de (%)</span>
              <input
                type="number"
                min="20"
                max="90"
                step="1"
                value={rascunho.limiteEssencial}
                onChange={(event) => alterar('limiteEssencial', event.target.value)}
              />
            </label>
            <label className={styles.campo}>
              <span>Risco: total a partir de (%)</span>
              <input
                type="number"
                min="30"
                max="100"
                step="1"
                value={rascunho.limiteTotal}
                onChange={(event) => alterar('limiteTotal', event.target.value)}
              />
            </label>
          </div>
          <button type="button" className={styles.botaoLink} onClick={restaurarLimites}>
            Restaurar padrão (50% e 80%)
          </button>
        </fieldset>

        <fieldset className={styles.grupo}>
          <legend>Simulador de Investimentos</legend>
          <p className={styles.descricao}>Valores que o simulador já traz preenchidos ao abrir.</p>
          <div className={styles.linha}>
            <label className={styles.campo}>
              <span>Prazo padrão (meses)</span>
              <input
                type="number"
                min="1"
                max="360"
                step="1"
                value={rascunho.simuladorPrazoMeses}
                onChange={(event) => alterar('simuladorPrazoMeses', event.target.value)}
              />
            </label>
            <label className={styles.campo}>
              <span>CDB rende (% do CDI)</span>
              <input
                type="number"
                min="50"
                max="200"
                step="1"
                value={rascunho.simuladorPercentualCdi}
                onChange={(event) => alterar('simuladorPercentualCdi', event.target.value)}
              />
            </label>
          </div>
        </fieldset>

        <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso>
        <div className={styles.acoes}>
          <button type="submit" className={styles.botaoPrimario} disabled={salvando || !editado}>
            Salvar
          </button>
        </div>
      </form>
    </section>
  )
}

function SecaoExclusao() {
  const [periodo, setPeriodo] = useState('MES_PASSADO')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [previa, setPrevia] = useState(null)
  const [confirmacao, setConfirmacao] = useState('')
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' })
  const [processando, setProcessando] = useState(false)

  const intervalo = intervaloDoPeriodo(periodo, dataInicio, dataFim)
  const personalizadoIncompleto = periodo === 'PERSONALIZADO' && (!dataInicio || !dataFim)

  // Trocar o período invalida a prévia: a confirmação sempre vale pro que está na tela
  const trocarPeriodo = (alteracao) => {
    alteracao()
    setPrevia(null)
    setConfirmacao('')
  }

  const verPrevia = async () => {
    setProcessando(true)
    setMensagem({ tipo: '', texto: '' })
    try {
      setPrevia(await exclusaoService.previa(intervalo[0], intervalo[1]))
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: mensagemDeErro(erro, 'Não foi possível calcular a prévia.') })
    } finally {
      setProcessando(false)
    }
  }

  const excluir = async () => {
    setProcessando(true)
    try {
      const resultado = await exclusaoService.excluir(intervalo[0], intervalo[1])
      setPrevia(null)
      setConfirmacao('')
      setMensagem({
        tipo: 'sucesso',
        texto:
          `${resultado.quantidade} transação(ões) excluída(s) (${descreverIntervalo(intervalo)}).` +
          (resultado.parcelasMantidas > 0 ? ` ${resultado.parcelasMantidas} parcela(s) foram mantidas.` : ''),
      })
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: mensagemDeErro(erro, 'Não foi possível excluir as transações.') })
    } finally {
      setProcessando(false)
    }
  }

  return (
    <section className={`${styles.secao} ${styles.zonaPerigo}`}>
      <h2>
        <i className="bi bi-exclamation-octagon-fill" aria-hidden="true" /> Zona de perigo
      </h2>
      <h3>Excluir transações por período</h3>
      <p className={styles.descricao}>
        Apaga de uma vez as receitas e despesas do período, junto com o que delas foi destinado a metas. Não dá pra
        desfazer. Parcelas de parcelamentos ficam de fora: pra apagá-las, exclua o parcelamento em Transações.
      </p>

      <div className={styles.linha}>
        <label className={styles.campo}>
          <span>Período</span>
          <select value={periodo} onChange={(event) => trocarPeriodo(() => setPeriodo(event.target.value))}>
            {opcoesPeriodo.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.texto}
              </option>
            ))}
          </select>
        </label>
        {periodo === 'PERSONALIZADO' ? (
          <>
            <label className={styles.campo}>
              <span>De</span>
              <input
                type="date"
                value={dataInicio}
                max={dataFim || undefined}
                onChange={(event) => trocarPeriodo(() => setDataInicio(event.target.value))}
              />
            </label>
            <label className={styles.campo}>
              <span>Até</span>
              <input
                type="date"
                value={dataFim}
                min={dataInicio || undefined}
                onChange={(event) => trocarPeriodo(() => setDataFim(event.target.value))}
              />
            </label>
          </>
        ) : null}
      </div>

      {!previa ? (
        <div className={styles.acoes}>
          <button
            type="button"
            className={styles.botaoSecundario}
            onClick={verPrevia}
            disabled={processando || personalizadoIncompleto}
          >
            Ver o que será excluído
          </button>
        </div>
      ) : previa.quantidade === 0 ? (
        <p className={styles.previaVazia}>
          Nenhuma transação para excluir {descreverIntervalo(intervalo)}
          {previa.parcelasMantidas > 0 ? ` (${previa.parcelasMantidas} parcela(s) no período ficam mantidas)` : ''}.
        </p>
      ) : (
        <div className={styles.previa}>
          <p>
            Serão excluídas <strong>{previa.quantidade} transação(ões)</strong> {descreverIntervalo(intervalo)}:
          </p>
          <ul>
            <li>Receitas: {formatadorMoeda.format(previa.totalReceitas)}</li>
            <li>Despesas: {formatadorMoeda.format(previa.totalDespesas)}</li>
            {previa.contribuicoesMetas > 0 ? (
              <li>
                {previa.contribuicoesMetas} contribuição(ões) a metas ({formatadorMoeda.format(previa.valorContribuidoMetas)})
                saem junto, e o progresso dessas metas diminui
              </li>
            ) : null}
            {previa.parcelasMantidas > 0 ? <li>{previa.parcelasMantidas} parcela(s) no período serão mantidas</li> : null}
          </ul>
          <label className={styles.campo}>
            <span>
              Para confirmar, digite <strong>{PALAVRA_CONFIRMACAO}</strong>
            </span>
            <input
              type="text"
              autoComplete="off"
              value={confirmacao}
              onChange={(event) => setConfirmacao(event.target.value)}
            />
          </label>
          <div className={styles.acoes}>
            <button
              type="button"
              className={styles.botaoSecundario}
              onClick={() => trocarPeriodo(() => {})}
              disabled={processando}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={styles.botaoPerigo}
              onClick={excluir}
              disabled={processando || confirmacao.trim().toUpperCase() !== PALAVRA_CONFIRMACAO}
            >
              Excluir {previa.quantidade} transação(ões)
            </button>
          </div>
        </div>
      )}

      <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso>
    </section>
  )
}

function SecaoExportar() {
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' })
  const [exportando, setExportando] = useState(false)

  const exportar = async () => {
    setExportando(true)
    setMensagem({ tipo: '', texto: '' })
    try {
      const transacoes = await transacaoService.listar()
      if (transacoes.length === 0) {
        setMensagem({ tipo: 'erro', texto: 'Você ainda não tem transações para exportar.' })
        return
      }
      baixarCsv(`financeflow-transacoes-${dataIso(new Date())}.csv`, [
        CABECALHO_TRANSACOES,
        ...linhasDeTransacoes(transacoes),
      ])
      setMensagem({ tipo: 'sucesso', texto: `${transacoes.length} transação(ões) exportada(s).` })
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: mensagemDeErro(erro, 'Não foi possível exportar as transações.') })
    } finally {
      setExportando(false)
    }
  }

  return (
    <section className={styles.secao}>
      <h2>Exportar transações</h2>
      <p className={styles.descricao}>
        Baixa todo o seu histórico num arquivo CSV que abre no Excel ou no Google Planilhas: data, tipo, categoria,
        descrição e valor (despesas com sinal negativo). Os valores saem completos mesmo com "ocultar valores" ligado.
      </p>
      <div className={styles.acoes}>
        <button type="button" className={styles.botaoSecundario} onClick={exportar} disabled={exportando}>
          <i className="bi bi-filetype-csv" aria-hidden="true" /> {exportando ? 'Exportando...' : 'Exportar CSV'}
        </button>
      </div>
      <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso>
    </section>
  )
}

function SecaoCategoriasPadrao() {
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' })
  const [restaurando, setRestaurando] = useState(false)

  const restaurar = async () => {
    setRestaurando(true)
    setMensagem({ tipo: '', texto: '' })
    try {
      const adicionadas = await categoriaService.adicionarPredefinidas()
      setMensagem({
        tipo: 'sucesso',
        texto:
          adicionadas.length === 0
            ? 'Você já tem todas as categorias padrão.'
            : `${adicionadas.length} categoria(s) adicionada(s): ${adicionadas.map((c) => c.nome).join(', ')}.`,
      })
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: mensagemDeErro(erro, 'Não foi possível restaurar as categorias.') })
    } finally {
      setRestaurando(false)
    }
  }

  return (
    <section className={styles.secao}>
      <h2>Categorias padrão</h2>
      <p className={styles.descricao}>
        Apagou sem querer alguma das categorias que vieram com a conta (Salário, Alimentação, Moradia...)? Isto recria as
        que estiverem faltando. As suas categorias e as que você editou continuam como estão.
      </p>
      <div className={styles.acoes}>
        <button type="button" className={styles.botaoSecundario} onClick={restaurar} disabled={restaurando}>
          <i className="bi bi-arrow-counterclockwise" aria-hidden="true" /> Restaurar categorias padrão
        </button>
      </div>
      <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso>
    </section>
  )
}

function SecaoAjuda() {
  const { abrirTutorial } = usePreferencias()

  return (
    <>
      <section className={styles.secao}>
        <h2>Tutorial</h2>
        <p className={styles.descricao}>O passo a passo do primeiro acesso, com o que cada tela do FinanceFlow faz.</p>
        <div className={styles.acoes}>
          <button type="button" className={styles.botaoPrimario} onClick={abrirTutorial}>
            <i className="bi bi-play-circle" aria-hidden="true" /> Rever tutorial
          </button>
        </div>
      </section>

      <section className={styles.secao}>
        <h2>Perguntas frequentes</h2>
        <dl className={styles.perguntas}>
          <dt>Por que não consigo editar uma parcela?</dt>
          <dd>
            As parcelas precisam somar o valor total da compra. Para corrigir, exclua o parcelamento em Transações e lance
            de novo.
          </dd>
          <dt>O que conta como despesa essencial?</dt>
          <dd>
            Você decide, marcando a categoria como essencial em Categorias (moradia, saúde e contas costumam ser). É isso
            que o alerta de comprometimento usa.
          </dd>
          <dt>Importei um extrato e veio uma linha repetida.</dt>
          <dd>
            Na prévia da importação, as linhas que já existem vêm marcadas como duplicadas e desmarcadas. Se mesmo assim
            entrou repetida, é só excluir a transação.
          </dd>
          <dt>De onde vêm as taxas do simulador?</dt>
          <dd>
            Selic, CDI e poupança vêm da API pública do Banco Central e são atualizadas a cada hora. O Ibovespa do rodapé
            vem do Yahoo Finance.
          </dd>
        </dl>
      </section>

      <section className={styles.secao}>
        <h2>Sobre</h2>
        <p className={styles.descricao}>
          FinanceFlow 0.1.0 · Projeto do curso de Análise e Desenvolvimento de Sistemas da Fatec Ipiranga (2026).
        </p>
      </section>
    </>
  )
}

const abas = [
  { id: 'perfil', rotulo: 'Meu perfil', icone: 'person-circle' },
  { id: 'aparencia', rotulo: 'Aparência e privacidade', icone: 'palette' },
  { id: 'financas', rotulo: 'Alertas e simulador', icone: 'sliders' },
  { id: 'dados', rotulo: 'Dados', icone: 'database' },
  { id: 'ajuda', rotulo: 'Ajuda', icone: 'question-circle' },
]

function Configuracoes() {
  const { sair } = useAuth()
  const [parametros, setParametros] = useSearchParams()
  // A aba fica na URL (?aba=), pra dar pra linkar direto e o voltar do navegador funcionar
  const abaAtual = abas.some((aba) => aba.id === parametros.get('aba')) ? parametros.get('aba') : 'perfil'

  return (
    <div className={styles.pagina}>
      <h1>Configurações</h1>
      <div className={styles.estrutura}>
        <nav className={styles.abas} aria-label="Seções das configurações">
          {abas.map((aba) => (
            <button
              key={aba.id}
              type="button"
              className={aba.id === abaAtual ? styles.abaAtiva : styles.aba}
              aria-current={aba.id === abaAtual ? 'page' : undefined}
              onClick={() => setParametros({ aba: aba.id })}
            >
              <i className={`bi bi-${aba.icone}`} aria-hidden="true" /> {aba.rotulo}
            </button>
          ))}
        </nav>

        <div className={styles.conteudoAba}>
          {abaAtual === 'perfil' ? (
            <>
              <SecaoConta />
              <SecaoSenha />
              <section className={styles.secao}>
                <h2>Sessão</h2>
                <p className={styles.descricao}>Sai desta conta neste navegador.</p>
                <div className={styles.acoes}>
                  <button type="button" className={styles.botaoSecundario} onClick={sair}>
                    <i className="bi bi-box-arrow-right" aria-hidden="true" /> Sair da conta
                  </button>
                </div>
              </section>
            </>
          ) : null}
          {abaAtual === 'aparencia' ? <SecaoAparencia /> : null}
          {abaAtual === 'financas' ? <SecaoFinancas /> : null}
          {abaAtual === 'dados' ? (
            <>
              <SecaoExportar />
              <SecaoCategoriasPadrao />
              <SecaoExclusao />
            </>
          ) : null}
          {abaAtual === 'ajuda' ? <SecaoAjuda /> : null}
        </div>
      </div>
    </div>
  )
}

export default Configuracoes
