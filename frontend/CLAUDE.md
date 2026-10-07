# FinanceFlow — Frontend

Aplicação React que consome a API REST do backend (Spring Boot).

## Stack

- **React 19** (functional components + hooks — sem class components)
- **Build/dev server**: Vite (`npm run dev` em `localhost:5173`;
  `npm run build` gera a pasta `build/`)
- **Rotas**: React Router 7
- **Estilização**: CSS Modules (`Componente.module.css` ao lado do
  componente)
- **Cliente HTTP**: Axios
- **Gráficos**: Recharts
- **Ícones**: `bootstrap-icons` (CSS importado globalmente em `main.jsx`)
- **Lint**: oxlint (`npm run lint`)
- **Gerenciamento de estado**: Context API nativo (sem Redux/Zustand
  por enquanto — o escopo do projeto não justifica a dependência extra)

URL da API vem de `VITE_API_URL` (ver `.env.example`); sem ela, usa
`http://localhost:8080`.

## Estrutura de pastas

```
frontend/src/
├── components/       # componentes reutilizáveis (modais, SeletorCategoria, Layout, RodapeMercado...)
├── pages/            # telas (Login, Dashboard, Transacoes, Categorias, Metas)
├── contexts/         # Context API (AuthContext)
├── services/         # chamadas Axios à API (um arquivo por recurso)
├── App.jsx           # rotas
└── main.jsx          # bootstrap (BrowserRouter + AuthProvider)
```

Componentes/páginas com estilo próprio vêm com seu `.module.css` na
mesma pasta (ex: `Login.jsx` + `Login.module.css`). Componentes sem
estilo próprio ou com estilo inline não têm (`RotaProtegida`,
`IconeCategoria`, `ModalContribuicaoMeta` — este reaproveita o CSS de
`ModalMeta`).

## Convenção de nomes

- Componentes e páginas em `PascalCase` (`ListaTransacoes.jsx`)
- Funções e variáveis em `camelCase`
- Nomes de domínio em português, alinhados com o backend
  (`usuario`, `categoria`, `transacao` — não `user`, `category`)

## Camada de serviços (chamadas à API)

Um arquivo por recurso, isolando o Axios do resto do app:

```
services/
├── api.js                      # instância base do Axios (baseURL, interceptor de token)
├── usuarioService.js           # cadastro, login, usuário atual (GET /usuarios/me)
├── categoriaService.js
├── transacaoService.js
├── metaService.js              # CRUD de metas + contribuições
└── indicadorMercadoService.js  # Selic/Dólar/Ibovespa do rodapé
```

`api.js` centraliza a URL base da API e o interceptor que lê o token
JWT do `localStorage` (chave `CHAVE_TOKEN` = `financeflow.token`) e o
injeta no header `Authorization` de toda requisição.

## Autenticação

- Token JWT retornado pelo backend no login é guardado no
  `AuthContext` e persistido em `localStorage` (sobrevive a reload).
  Só o `AuthContext` e o `api.js` mexem nessa chave — componentes não
  acessam `localStorage` direto.
- Ao carregar com token, o `AuthContext` chama `GET /usuarios/me`; se
  falhar (token expirado/inválido), limpa o token e desloga.
- Rotas que exigem login ficam dentro de `RotaProtegida` (em
  `App.jsx`), que redireciona para `/login` se não houver token no
  contexto. As rotas autenticadas são renderizadas dentro de `Layout`
  (menu lateral + `RodapeMercado`).

## Sprint#1 — Telas (concluída)

- Login, com aba de cadastro de usuário na mesma tela (`Login.jsx`)
- CRUD de Categoria (listar, criar, editar, excluir)
- CRUD de Transação (registrar, listar, editar, excluir)
- Dashboard com cards de Receitas/Despesas/Saldo

## Sprint#2 — Telas (concluída)

- **Metas Financeiras** (caso de uso principal, `pages/Metas.jsx`):
  listar metas com progresso (barra e %), criar/editar meta (nome,
  valor alvo, categoria de receita vinculada **obrigatória**, data
  alvo opcional), excluir meta. Item "Metas Financeiras" ativo no menu
  lateral.
  - Progresso NÃO é mais automático a partir de todas as receitas da
    categoria — é a soma de contribuições explícitas. Ao salvar uma
    Transação nova do tipo RECEITA (`pages/Transacoes.jsx`,
    `handleSalvar`) cuja categoria bate com a de alguma meta, abre
    `components/ModalContribuicaoMeta.jsx` perguntando quanto (se
    algo) desse valor vai pra cada meta encontrada — um campo por
    meta, limitado ao menor entre o saldo livre da transação e o
    quanto falta pra bater `valorAlvo` daquela meta (campo desabilita
    com "Meta já concluída" quando não sobra nada), soma validada no
    cliente e de novo no backend (`POST /metas/{id}/contribuicoes`,
    ver `backend/CLAUDE.md` 6.1.1). "Agora não" fecha sem contribuir.
  - Clicar em "Agora não" (ou editar a transação depois) não perde a
    chance de contribuir: toda linha de uma Transação RECEITA cuja
    categoria tem meta vinculada ganha um botão 🎯 ("Adicionar a uma
    meta financeira") na coluna Ações de `pages/Transacoes.jsx`, ao
    lado de editar/excluir — reabre o mesmo `ModalContribuicaoMeta`,
    usando `transacao.valorContribuidoMetas` (vindo do backend) pra
    calcular quanto da transação ainda pode ser destinado. Some
    quando a transação não é receita ou a categoria não tem meta
    vinculada.
  - `ModalAporte` (registro livre de aporte, sem ligação com uma
    Transação) foi removido numa iteração anterior desta sprint e
    substituído por esse fluxo.
- **Gráficos no Dashboard** (`Dashboard.jsx`, com **Recharts**):
  - "Evolução nos Últimos 6 Meses" — consome
    `GET /transacoes/evolucao-mensal`.
  - "Despesas por Categoria" — consome
    `GET /transacoes/despesas-por-categoria`.
  - O card "Comprometimento" continua com "Em breve" — depende do
    Indicador de comprometimento de renda (Sprint#3).
- **Categorias pré-definidas**: sem botão — `pages/Categorias.jsx`
  chama `categoriaService.adicionarPredefinidas()` silenciosamente
  toda vez que a tela carrega (erro dessa chamada é ignorado, só não
  adiciona nada), pra usuários que já existiam antes dessa mudança
  também acabarem com o catálogo padrão sem precisar fazer nada.
  `ModalCategoria` ganhou seleção de `icone` e `cor` (hex), ambos
  opcionais.
- **Ícones**: `bootstrap-icons` (pacote npm, CSS importado globalmente
  em `main.jsx`) substituiu emoji em tudo relacionado a categoria.
  `icone` é o nome da classe sem o prefixo `bi-` (ex: "cup-hot-fill");
  renderizado via `components/IconeCategoria.jsx` (`<i class="bi
  bi-${icone}">` dentro de um círculo colorido com `cor`) — usado em
  `SeletorCategoria`, na listagem de `Categorias.jsx` e no preview do
  picker de `ModalCategoria`. O picker de `ModalCategoria` tem ~34
  ícones e ~18 cores pra escolher (bem mais que os ~12/~8 da versão
  anterior com emoji).
- **Seletor de categoria em cards**: `components/SeletorCategoria.jsx`
  substitui o `<select>` nativo em `ModalTransacao` e `ModalMeta` —
  grid de cards com ícone/cor por categoria, reaproveitável em
  qualquer lugar que precise escolher uma categoria.
- **Rodapé de indicadores de mercado**: `components/RodapeMercado.jsx`,
  renderizado em `Layout.jsx` (visível em todas as rotas
  autenticadas), consome `GET /indicadores/mercado` a cada 5 minutos
  via `services/indicadorMercadoService.js`. Indicador com valor
  ausente (alguma das 3 fontes externas fora do ar, ver
  `backend/CLAUDE.md` 6.4) simplesmente não aparece — sem erro visível
  pro usuário.

Sem parcelamento, simulação de investimento completa, indicador de
comprometimento de renda ou sugestões ainda — isso é para sprints
futuras (ver `backend/CLAUDE.md`).
