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
  categoria de receita vinculada **obrigatória**, data alvo opcional),
  excluir meta. Ativa o item "Metas Financeiras" do menu lateral (hoje
  desabilitado).
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
- **Gráficos no Dashboard**: os dois cards hoje com "Em breve"
  (`Dashboard.jsx`) ganham gráficos de verdade com **Recharts**:
  - "Evolução nos Últimos 6 Meses" — consome
    `GET /transacoes/evolucao-mensal`.
  - "Despesas por Categoria" — consome
    `GET /transacoes/despesas-por-categoria`.
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
  ausente (ex: Ibovespa sem `BRAPI_TOKEN` configurado no backend)
  simplesmente não aparece — sem erro visível pro usuário.

Sem parcelamento, simulação de investimento completa, indicador de
comprometimento de renda ou sugestões ainda — isso é para sprints
futuras (ver `backend/CLAUDE.md`).
