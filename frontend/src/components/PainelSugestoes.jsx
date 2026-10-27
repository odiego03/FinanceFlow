import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePreferencias } from '../contexts/PreferenciasContext'
import { Carregando, Esqueleto, EsqueletoTexto } from './Esqueleto'
import styles from './PainelSugestoes.module.css'

const QUANTIDADE_INICIAL = 4

// Severidade sempre com ícone + texto, nunca só cor
const SEVERIDADES = {
  ALERTA: { texto: 'Alerta', icone: 'x-octagon-fill', classe: 'alerta' },
  ATENCAO: { texto: 'Atenção', icone: 'exclamation-triangle-fill', classe: 'atencao' },
  DICA: { texto: 'Dica', icone: 'lightbulb-fill', classe: 'dica' },
}

const ACOES = {
  REDUZIR_GASTOS: { rota: '/transacoes', texto: 'Ver despesas' },
  REDUZIR_ESSENCIAIS: { rota: '/transacoes', texto: 'Ver despesas' },
  SEM_RENDA: { rota: '/transacoes', texto: 'Lançar receita' },
  INVESTIR_SOBRA: { rota: '/simulacao', texto: 'Abrir o simulador' },
  META_VENCIDA: { rota: '/metas', texto: 'Ver metas' },
  META_ATRASADA: { rota: '/metas', texto: 'Ver metas' },
  META_NO_PRAZO: { rota: '/metas', texto: 'Ver metas' },
  PARCELAS_ACIMA_DA_MARGEM: { rota: '/transacoes', texto: 'Ver parcelas' },
}

function PainelSugestoes({ sugestoes, carregando, erro, rotuloMes }) {
  const [mostrarTodas, setMostrarTodas] = useState(false)
  const { formatarMoeda, ocultarValoresNoTexto } = usePreferencias()

  let conteudo
  if (carregando) {
    conteudo = (
      <Carregando rotulo="Analisando suas finanças" className={styles.lista}>
        {[0, 1].map((indice) => (
          <div key={indice} className={styles.item}>
            <Esqueleto largura={90} altura={20} raio={999} />
            <Esqueleto largura="55%" altura={16} />
            <EsqueletoTexto linhas={2} />
          </div>
        ))}
      </Carregando>
    )
  } else if (erro) {
    conteudo = <p className={styles.vazio}>Não foi possível carregar as sugestões agora.</p>
  } else if (sugestoes.length === 0) {
    conteudo = (
      <p className={styles.vazio}>
        <i className="bi bi-check-circle" aria-hidden="true" /> Nenhuma sugestão por enquanto: suas finanças de{' '}
        {rotuloMes} estão em dia.
      </p>
    )
  } else {
    const visiveis = mostrarTodas ? sugestoes : sugestoes.slice(0, QUANTIDADE_INICIAL)
    conteudo = (
      <>
        <ul className={styles.lista}>
          {visiveis.map((sugestao, indice) => {
            const severidade = SEVERIDADES[sugestao.severidade]
            const acao = ACOES[sugestao.tipo]
            return (
              <li key={`${sugestao.tipo}-${indice}`} className={`${styles.item} ${styles[severidade.classe]}`}>
                <span className={styles.selo}>
                  <i className={`bi bi-${severidade.icone}`} aria-hidden="true" /> {severidade.texto}
                </span>
                <h3>{sugestao.titulo}</h3>
                <p>{ocultarValoresNoTexto(sugestao.mensagem)}</p>
                {sugestao.itens.length > 0 ? (
                  <ul className={styles.itens}>
                    {sugestao.itens.map((item) => (
                      <li key={item.nome}>
                        <span>{item.nome}</span>
                        <strong>{formatarMoeda(item.valor)}</strong>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {acao ? (
                  <Link to={acao.rota} className={styles.acao}>
                    {acao.texto} <i className="bi bi-arrow-right" aria-hidden="true" />
                  </Link>
                ) : null}
              </li>
            )
          })}
        </ul>
        {sugestoes.length > QUANTIDADE_INICIAL ? (
          <button type="button" className={styles.verTodas} onClick={() => setMostrarTodas((atual) => !atual)}>
            {mostrarTodas ? 'Mostrar menos' : `Ver todas (${sugestoes.length})`}
          </button>
        ) : null}
      </>
    )
  }

  return (
    <section className={styles.painel} aria-labelledby="tituloSugestoes">
      <div className={styles.topo}>
        <h2 id="tituloSugestoes">Sugestões para você</h2>
        <span className={styles.base}>Gastos e sobra de {rotuloMes}; metas e parcelas a partir de hoje</span>
      </div>
      {conteudo}
    </section>
  )
}

export default PainelSugestoes
