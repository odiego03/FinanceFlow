import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { PREFERENCIAS_PADRAO, usePreferencias } from '../contexts/PreferenciasContext'
import { mensagemDeErro } from '../services/api'
import * as exclusaoService from '../services/exclusaoService'
import * as usuarioService from '../services/usuarioService'
import styles from './Perfil.module.css'

// Na exclusão os valores aparecem mesmo com "ocultar valores" ligado: quem vai apagar precisa ver o que apaga
const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const formatadorData = new Intl.DateTimeFormat('pt-BR')

const PALAVRA_CONFIRMACAO = 'EXCLUIR'

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

function SecaoPreferencias() {
  const { preferencias, salvar } = usePreferencias()
  const [rascunho, setRascunho] = useState(preferencias)
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' })
  const [salvando, setSalvando] = useState(false)

  // O olho da barra superior também muda "ocultarValores": mantém o rascunho em dia
  useEffect(() => {
    setRascunho(preferencias)
  }, [preferencias])

  const alterar = (campo, valor) => setRascunho((atual) => ({ ...atual, [campo]: valor }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    const novas = {
      ocultarValores: rascunho.ocultarValores,
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
      setMensagem({ tipo: 'sucesso', texto: 'Preferências salvas.' })
    } catch (erro) {
      const dados = erro?.response?.data
      // Erro de validação de campo vem como {campo: mensagem}, sem "mensagem"
      const primeiroErroDeCampo = dados && !dados.mensagem ? Object.values(dados)[0] : null
      setMensagem({
        tipo: 'erro',
        texto: primeiroErroDeCampo || mensagemDeErro(erro, 'Não foi possível salvar as preferências.'),
      })
    } finally {
      setSalvando(false)
    }
  }

  const restaurarLimites = () => {
    setRascunho((atual) => ({
      ...atual,
      limiteEssencial: PREFERENCIAS_PADRAO.limiteEssencial,
      limiteTotal: PREFERENCIAS_PADRAO.limiteTotal,
    }))
  }

  return (
    <section className={styles.secao}>
      <h2>Preferências</h2>
      <p className={styles.descricao}>Ficam salvas na sua conta e valem em qualquer computador em que você entrar.</p>
      <form onSubmit={handleSubmit} className={styles.formulario}>
        <fieldset className={styles.grupo}>
          <legend>Privacidade</legend>
          <label className={styles.alternador}>
            <input
              type="checkbox"
              checked={rascunho.ocultarValores}
              onChange={(event) => alterar('ocultarValores', event.target.checked)}
            />
            <span>
              Ocultar valores em R$
              <small>
                Dashboard, Transações e Metas mostram "R$ •••••". Dá pra alternar a qualquer momento pelo olho na barra
                superior.
              </small>
            </span>
          </label>
        </fieldset>

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
          <button type="submit" className={styles.botaoPrimario} disabled={salvando}>
            Salvar preferências
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

function Perfil() {
  return (
    <div className={styles.pagina}>
      <h1>Meu Perfil</h1>
      <div className={styles.colunas}>
        <SecaoConta />
        <SecaoSenha />
      </div>
      <SecaoPreferencias />
      <SecaoExclusao />
    </div>
  )
}

export default Perfil
