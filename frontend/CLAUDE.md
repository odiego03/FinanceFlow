# FinanceFlow — Frontend

Aplicação React que consome a API REST do backend (Spring Boot).

## Stack

- **React** (functional components + hooks — sem class components)
- **Estilização**: CSS Modules (`Componente.module.css` ao lado do
  componente)
- **Cliente HTTP**: Axios
- **Gerenciamento de estado**: Context API nativo (sem Redux/Zustand
  por enquanto — o escopo do projeto não justifica a dependência extra)

## Estrutura de pastas

```
frontend/src/
├── components/       # componentes reutilizáveis (Button, Input, Card...)
├── pages/            # telas (Login, Dashboard, Transacoes...)
├── contexts/         # Context API (ex: AuthContext)
├── services/         # chamadas Axios à API (um arquivo por recurso)
└── App.jsx
```

Cada componente/página vem com seu próprio `.module.css` na mesma
pasta (ex: `Login.jsx` + `Login.module.css`).

## Convenção de nomes

- Componentes e páginas em `PascalCase` (`ListaTransacoes.jsx`)
- Funções e variáveis em `camelCase`
- Nomes de domínio em português, alinhados com o backend
  (`usuario`, `categoria`, `transacao` — não `user`, `category`)

## Camada de serviços (chamadas à API)

Um arquivo por recurso, isolando o Axios do resto do app:

```
services/
├── api.js              # instância base do Axios (baseURL, interceptor de token)
├── usuarioService.js
├── categoriaService.js
└── transacaoService.js
```

`api.js` centraliza a URL base da API e o interceptor que injeta o
token JWT (guardado no `AuthContext`) no header `Authorization` de
toda requisição.

## Autenticação

- Token JWT retornado pelo backend no login é guardado no
  `AuthContext` (e persistido em `localStorage` para sobreviver a
  reload da página).
- Rotas que exigem login usam um componente `RotaProtegida` que
  redireciona para `/login` se não houver usuário autenticado no
  contexto.

## Sprint#1 — Telas necessárias (concluída)

- Login
- Cadastro de usuário
- CRUD de Categoria (listar, criar, editar, excluir)
- CRUD de Transação (registrar, listar, editar, excluir)
- Dashboard com cards de Receitas/Despesas/Saldo (sem gráficos ainda)

## Sprint#2 — Telas necessárias

- **Metas Financeiras** (caso de uso principal): listar metas com
  progresso (barra ou %), criar/editar meta (nome, valor alvo,
  categoria de receita vinculada opcional, data alvo opcional),
  registrar aporte manual numa meta, excluir meta/aporte. Ativa o
  item "Metas Financeiras" do menu lateral (hoje desabilitado).
- **Gráficos no Dashboard**: os dois cards hoje com "Em breve"
  (`Dashboard.jsx`) ganham gráficos de verdade com **Recharts**:
  - "Evolução nos Últimos 6 Meses" — consome
    `GET /transacoes/evolucao-mensal`.
  - "Despesas por Categoria" — consome
    `GET /transacoes/despesas-por-categoria`.

Sem categorias pré-definidas, dropdown de categoria em cards, dados
de mercado externos, parcelamento, simulação, indicador ou sugestões
ainda — isso é para sprints futuras (ver `backend/CLAUDE.md`).
