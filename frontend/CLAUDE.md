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
- **Sessão expirada**: o backend responde `401` pra token ausente,
  inválido ou expirado. O interceptor de resposta em `services/api.js`
  pega um `401` de uma requisição que **levava** token, apaga o token,
  marca `financeflow.sessaoExpirada` no `sessionStorage` e recarrega em
  `/login` (recarregar de propósito zera todo o estado, inclusive o
  `AuthContext`, sem acoplar o axios ao React). `Login.jsx` lê essa
  marca uma vez e mostra "Sua sessão expirou. Entre de novo." O `401`
  do próprio `POST /login` (senha errada) não tem token, então não
  dispara isso.
- **Mensagens de erro**: `mensagemDeErro(erro, padrao)` em
  `services/api.js` devolve o `mensagem` que o backend manda (ex: o
  motivo do `409` ao excluir categoria em uso) ou o texto padrão da
  tela — usar isso nos `catch` em vez de texto fixo.

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
  - "Evolução nos Últimos N Meses" — consome
    `GET /transacoes/evolucao-mensal?meses=N`, com seletor 3m/6m/12m
    no topo do card.
  - "Despesas/Receitas por Categoria" — consome
    `GET /transacoes/por-categoria?tipo=&mes=`, com seletor
    Despesas/Receitas no topo do card. Cor de cada fatia = `cor` da
    própria categoria (a cor segue a categoria, nunca a posição no
    ranking — trocar filtro não repinta); acima de 8 categorias as
    menores viram uma fatia "Outras" cinza; rótulo de % só em fatia
    ≥ 5%.
  - **Filtro de período** no cabeçalho (meses com lançamento + mês
    atual + "Todo o período") vale pros cards Receitas/Despesas/Saldo
    e pro gráfico por categoria. Sem escolha do usuário, abre no mês
    mais recente que tem lançamento (não no mês atual, que pode estar
    vazio). Os cards são calculados no frontend a partir de
    `GET /transacoes` filtrado pelo período.
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

## Sprint#3 — Telas

- **Importar extrato** (`components/ModalImportarExtrato.jsx`): botão
  "Importar extrato" em `pages/Transacoes.jsx`, ao lado de "+ Nova
  Transação". Modal em duas etapas:
  1. **Upload** — escolhe o banco (Nubank/Itaú) e sobe um `.csv`;
     chama `transacaoService.importarPreview(banco, arquivo)`
     (`multipart/form-data` via `FormData` — `api.js` não precisou de
     nenhuma mudança, o axios detecta `FormData` sozinho).
  2. **Revisão** — tabela com uma linha por lançamento do preview:
     checkbox "incluir" (desmarcado por padrão quando a linha já veio
     `duplicada` do backend), `<select>` de categoria (filtrado por
     tipo RECEITA/DESPESA, pré-preenchido com a sugestão do backend) e
     um badge de status pela origem da categoria atual: Aprendida /
     Mesmo favorecido (verde), Sugerida (azul — palpite por
     palavra-chave, "confira"), Manual (cinza), Pendente (amarelo),
     Duplicada. Escolher a categoria de uma linha preenche também as
     outras linhas **pendentes** do mesmo favorecido (mesma `chave` e
     tipo) nesse extrato — nunca sobrescreve uma linha que já tem
     categoria. Um resumo acima da tabela mostra quantas linhas estão
     pendentes e quantas foram sugeridas. Botão "Confirmar importação" fica
     desabilitado até toda linha incluída ter uma categoria escolhida.
     Ao confirmar, chama `transacaoService.importarConfirmar(linhas)`
     — o próprio ato de confirmar "ensina" o sistema pra próxima
     importação com a mesma descrição (ver `backend/CLAUDE.md` 7.2).
  - Deliberadamente **não** reaproveita `SeletorCategoria` (grid de
    cards) na tabela de revisão — card grande não cabe bem numa tabela
    densa de várias linhas; um `<select>` compacto por linha é o
    padrão aqui.
  - O arquivo CSV nunca é mantido no frontend depois do upload — só o
    array de linhas já parseadas (vindas do preview) fica em estado
    local até a confirmação.
- **Filtros de Transações** (`pages/Transacoes.jsx`): tudo no
  frontend, sobre a lista já carregada por `GET /transacoes` (sem
  endpoint novo — volume de um usuário cabe na memória; se um dia
  precisar de paginação, os filtros migram pra query params do
  backend). Estado único `filtros` (busca, tipo, período, datas
  personalizadas, categoria, valor mín./máx., ordenação) com
  `FILTROS_INICIAIS` como referência pro "Limpar filtros". Datas
  comparadas como string ISO `AAAA-MM-DD`. Trocar o tipo limpa a
  categoria escolhida se ela for do outro tipo. Ordenação padrão: mais
  recentes primeiro. Um resumo mostra "N de M transações" e os totais
  de receita/despesa do conjunto filtrado.
- **Destinar às metas depois de importar**
  (`components/DestinarMetasImportacao.jsx`, etapa `metas` de
  `ModalImportarExtrato`): depois do `confirmar`, se alguma receita
  importada cair na categoria de uma meta ainda não concluída
  (`utils/agruparReceitasPorMeta.js`), o modal não fecha — mostra as
  receitas **agrupadas por meta**, com um campo de valor por
  receita e o botão "Completar a meta" (preenche em ordem até bater o
  que falta, sem passar do que já foi destinado da mesma receita a
  outra meta). Valida no front (soma por meta ≤ restante, soma por
  receita ≤ valor dela) e registra as contribuições uma a uma com
  `metaService.contribuir`. Se uma falhar no meio, mostra quantas já
  foram registradas, trava os campos e o "Destinar" de novo retoma só
  as que faltam. "Pular" conclui sem contribuição. Nessa etapa clicar
  no fundo **não** fecha o modal (as transações já existem; fechar
  perderia o aviso de sucesso). Sem receita de meta, o modal fecha
  direto como antes. A mensagem de sucesso em Transações inclui o total
  destinado às metas.
- **Indicador de comprometimento** (card "Comprometimento" de
  `pages/Dashboard.jsx`, serviço `services/comprometimentoService.js`):
  segue o filtro de período do Dashboard — em "Todo o período" não
  busca nada e pede pra escolher um mês, porque o indicador é mensal.
  Mostra o percentual total da renda comprometido, o nível como chip
  com **ícone + texto** (Saudável / Atenção / Risco / Sem renda no mês
  — nunca só cor) e o percentual das essenciais. Em `ATENCAO` ou
  `RISCO`, um alerta abaixo dos cards explica o motivo em texto.
- **Categoria essencial**: `ModalCategoria` mostra o checkbox "Despesa
  essencial" só quando o tipo é DESPESA (receita sempre manda
  `essencial: false`); a lista de Categorias mostra um selo "Essencial".
  O valor que vem do backend já é o efetivo (resolve o padrão das
  pré-definidas pra categorias antigas).
