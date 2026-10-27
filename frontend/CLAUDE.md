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
├── transacaoService.js          # inclui evolução, por categoria e importação de extrato
├── metaService.js               # metas e contribuições
├── parcelamentoService.js       # parcelamentos e sugestão de parcelas
├── simulacaoService.js          # simulação de investimento e taxas do BCB
├── sugestaoService.js           # sugestões personalizadas do Dashboard
├── exclusaoService.js           # prévia e exclusão de transações por período
├── relatorioService.js          # relatórios mensal e anual
├── indicadorMercadoService.js   # Selic, dólar, Ibovespa
└── comprometimentoService.js    # indicador de comprometimento de renda
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
- Ao abrir o app, o `AuthContext` busca `/usuarios/me` e só apaga o
  token se a resposta for `401`. Queda de rede ou `500` não deslogam.
- O login mostra a mensagem do backend só no bloqueio por tentativas
  (`429`); senha errada continua com o texto genérico.
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

## Sprint#2 — Telas necessárias (concluída)

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
    categoria tem meta vinculada ganha um botão de alvo ("Destinar a uma
    meta") nas ações da linha em `pages/Transacoes.jsx`, ao lado de
    editar/excluir — reabre o mesmo `ModalContribuicaoMeta`,
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
- **Dashboard** (`pages/Dashboard.jsx`, refeito na Sprint#4; sem emojis,
  só Bootstrap Icons). Os gráficos continuam os de antes (linha da
  evolução e pizza por categoria, ver abaixo); o resto foi reorganizado:
  - Cabeçalho com saudação pelo horário, seletor de mês com setas
    (anterior/próximo, mais o select com "Todo o período") e "Lançar
    transação", que abre o modal em Transações (`/transacoes?nova=1`).
  - Cards de Saldo, Receitas e Despesas com a variação contra o mês
    anterior ("49% a mais que setembro"). A cor diz se é bom ou ruim:
    receita subir é verde, despesa subir é vermelho.
  - Comprometimento como medidor de 0 a 100% da renda, com um traço no
    limite de risco, o selo de nível (ícone + texto) e, em atenção ou
    risco, a explicação dentro do próprio card (substitui o alerta em
    faixa separada).
  - "Últimas transações" (5 mais recentes até hoje, descrição resumida)
    com "Ver todas".
- **Tela de Transações** (`pages/Transacoes.jsx`, refeita na Sprint#4):
  - Três cards (Entradas, Saídas, Saldo) com os totais do filtro atual.
  - Barra de filtros: busca, período e tipo sempre à vista; categoria,
    faixa de valor e ordenação ficam em "Mais filtros" (o botão mostra
    quantos estão ativos).
  - Lista agrupada por dia ("Hoje", "Ontem", "Sexta-feira, 2 de
    outubro"), com o saldo do dia. Ordenando por valor, vira uma lista
    só, com a data em cada linha.
  - Cada linha mostra o ícone da categoria e a descrição resumida
    (`utils/descricao.js`: "Transferência enviada pelo Pix - MARIA ...
    Agência: 1 Conta: 12" vira "Maria" + "Pix enviado"; só resume
    quando o começo é uma operação de banco conhecida, então o que a
    pessoa digitou fica como está). A descrição inteira fica no
    `title`.
  - **Agendadas**: em "Mais recentes", as transações com data futura
    (parcelas que ainda vão vencer) ficam num bloco recolhido acima da
    lista, do vencimento mais próximo pro mais distante. Senão elas
    tomariam o topo.
  - **Paginação** no cliente (`components/Paginacao.jsx`, 20/50/100 por
    página). Mudar qualquer filtro volta pra página 1.
- **Moldura de modal** (`components/Modal.jsx`): cabeçalho com título e
  X, corpo que rola sozinho e rodapé fixo com as ações (os botões nunca
  somem). Fecha com Esc e clique no fundo (`podeFechar={false}`
  desliga). Foca o elemento com `data-autofoco` ou o primeiro campo.
  Usada por `ModalTransacao`, `ModalImportarExtrato`,
  `ModalContribuicaoMeta` e `ModalConfirmacao`. No celular vira uma
  folha que sobe de baixo.
  - `ModalTransacao`: tipo, valor (com "R$") e data, parcelar (logo
    abaixo do valor, porque muda o sentido dele), descrição e categoria
    (`SeletorCategoria compacto`, em pílulas).
  - `ModalImportarExtrato`: etapas Arquivo → Revisão → Metas, área de
    arrastar o CSV e descrições resumidas na revisão.
- **Esqueletos de carregamento** (`components/Esqueleto.jsx`): no lugar
  de "Carregando...", cada tela mostra blocos cinzas no formato do que
  vai chegar (a tabela de Transações com o cabeçalho de verdade, as
  colunas de Categorias, os cards de Metas, Relatórios e Simulador, os
  cards, sugestões e gráficos do Dashboard).
  - `Esqueleto` (bloco: `largura`, `altura`, `raio`, `circulo`),
    `EsqueletoTexto` (linhas de parágrafo) e `Carregando` (envolve a
    área: `role="status"`, o leitor de tela ouve só o `rotulo`, e os
    blocos ficam `aria-hidden`; aceita `className` pra herdar o grid ou
    o card da área de verdade).
  - Cores nos tokens `--esqueleto` e `--esqueleto-brilho` do
    `index.css`, com versão do tema escuro. Com
    `prefers-reduced-motion`, o brilho vira uma pulsação leve.
- **Barra superior** (`components/Layout.jsx`):
  - Esquerda: botão do menu, a marca (`components/Logo.jsx`, o mesmo
    desenho do `public/favicon.svg`; linha e "Flow" em dourado, quadrado
    preto no tema claro e branco no escuro, pelos tokens `--marca-*`) e o nome da tela atual com ícone
    (some abaixo de 1024px).
  - Direita: atalho claro/escuro (salva o tema na conta; no Automático
    considera o que o sistema está mostrando), o olho de ocultar
    valores e o menu do usuário. O menu tem avatar com iniciais e
    abre com nome, e-mail, Meu perfil, Configurações, Rever tutorial e
    Sair; fecha clicando fora ou com `Esc`. Abaixo de 600px fica só o
    avatar.
  - Os itens do menu lateral têm ícone (`icone` em `itensAtivos`, o
    mesmo usado no nome da tela atual).
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
  2. **Revisão** — lista responsiva (CSS grid, não `<table>`: a
     descrição de Pix passa de 200 caracteres e forçava rolagem
     lateral; agora ela quebra em até 2 linhas com o texto inteiro no
     `title`, e abaixo de 720px cada lançamento vira um cartão). Acima
     da lista: filtros rápidos Todas / Pendentes / Preenchidas /
     Duplicadas com contagem, e "Marcar todas" (age só nas linhas
     visíveis no filtro). Dois botões de confirmar: "Importar todas"
     (exige categoria em todas as incluídas) e "Importar só as
     categorizadas" (aparece quando há pendentes; importa só as que
     têm categoria e deixa as pendentes de fora — reimportar o mesmo
     arquivo depois traz as já importadas como duplicadas e as
     pendentes de novo). Cada lançamento tem:
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
    cards) na lista de revisão — card grande não cabe bem numa lista
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

## Sprint#4 — Telas

- **Parcelamento** (`components/ModalTransacao.jsx`, serviço
  `services/parcelamentoService.js`): sem tela própria. Em "+ Nova
  Transação" do tipo Despesa aparece o checkbox "Parcelar esta compra".
  Marcado, o valor vira "Valor total", aparece "Quantidade de parcelas"
  (2 a 60), a descrição fica obrigatória (até 190 caracteres) e a data
  vira "Data da 1ª parcela". Abaixo da quantidade:
  - a prévia `Nx de R$ ...`, calculada no front com a mesma divisão do
    backend (centavos na última), com o selo "Cabe no orçamento" ou
    "Acima da margem livre";
  - a caixa de sugestão, que consulta `GET /parcelamentos/sugestao`
    400ms depois que o usuário para de digitar. Ela mostra a margem
    livre, a menor quantidade que cabe com o botão "Usar Nx", e a conta
    (renda média − despesas médias − parcelas já agendadas). Margem
    zerada ou negativa vira alerta amarelo; sem receita nos 3 meses,
    explica que não dá pra calcular.
  A sugestão não bloqueia: dá pra parcelar acima da margem. Salvar
  chama `onSalvarParcelamento` (`POST /parcelamentos`), não `onSalvar`.
- **Parcelas em Transações** (`pages/Transacoes.jsx`): cada parcela tem
  o selo `n/N` (ícone de cartão) ao lado do badge Despesa, e não tem
  botão de editar. A lixeira de uma parcela abre "Excluir
  parcelamento", que diz quantas parcelas futuras serão apagadas e
  chama `DELETE /parcelamentos/{id}`; as vencidas ficam no histórico.
  O aviso verde de sucesso (`mensagemSucesso`, antes
  `mensagemImportacao`) é compartilhado entre a importação e o
  parcelamento.
- **Simulador de Investimentos** (`pages/Simulacao.jsx`, rota
  `/simulacao`, serviço `services/simulacaoService.js`): o item do menu
  lateral, que era "em breve", foi ativado.
  - **Cabeçalho**: taxas do dia (`GET /simulacoes/taxas`), inclusive a
    inflação (IPCA 12 meses), com "Fonte: Banco Central".
  - **Dois modos** (cartões no topo): "Quanto vou ter?" (resultado) e
    "Quanto preciso investir?" (meta).
  - **Abre já simulado**: R$ 1.000 + R$ 200/mês, com o prazo e o % do
    CDI das preferências. Se as preferências chegarem depois e a pessoa
    ainda não mexeu em nada, refaz com elas.
  - **Formulário do resultado**: valor inicial, aporte mensal, prazo (1
    a 360 meses, com atalhos) e "% do CDI" do CDB. Abaixo do aporte, o
    botão **"Usar minha sobra"** preenche com a sobra média real
    (`margemLivre` de `GET /parcelamentos/sugestao`: renda − despesas −
    parcelas agendadas nos 3 meses completos). Sem receita ou sem sobra,
    aparece uma frase no lugar do botão.
  - **Formulário da meta**: "Usar uma das suas metas" (metas não
    concluídas; preenche o que falta e o prazo até a data-alvo), "Quero
    juntar", "Já tenho", prazo e % do CDI. "Calcular aporte" chama
    `POST /simulacoes/aporte-necessario`. Cada card mostra o aporte por
    mês, quanto os juros fazem do caminho e o total colocado; o de menor
    aporte ganha "Menor esforço". "Ver mês a mês com esse aporte" leva
    pro modo resultado já simulado.
  - **Destaques** (frases acima dos cards, calculadas no front):
    diferença entre o melhor e o pior investimento; quem ganha ou perde
    da inflação; o mês em que os juros de um mês passam o aporte (só
    aparece se acontecer no prazo). No modo meta: se o aporte cabe na
    sobra média e quanto o objetivo vale em dinheiro de hoje.
  - **Cards por cenário**: valor líquido em destaque, rendimento
    líquido, valor bruto, IR ("Isento" na poupança), "Em dinheiro de
    hoje" e o selo verde/vermelho "Ganha/Perde da inflação". O melhor
    cenário ganha borda azul e o selo "Melhor opção". Cenário sem taxa
    mostra "Taxa indisponível no Banco Central agora".
  - **Gráfico de linhas** (Recharts): saldo bruto mês a mês dos cenários
    disponíveis, mais o "Valor investido" tracejado em cinza. A cor
    segue o cenário (Poupança `#eb6834`, CDB `#2a78d6`, Tesouro Selic
    `#1baf7a`, validados contra daltonismo) e se repete no marcador do
    card.
  - **Rodapé**: aviso de simulação educativa (taxas de hoje, IR por
    depósito, sem custódia do Tesouro nem IOF).
- **Sugestões** (`components/PainelSugestoes.jsx`, serviço
  `services/sugestaoService.js`): painel "Sugestões para você" no
  Dashboard, logo abaixo dos cards e do alerta de comprometimento.
  - **Dados**: chama `GET /sugestoes?mes=` com o mês do filtro de
    período ("Todo o período" usa o mês atual).
  - **Cada sugestão**: selo de severidade com **ícone + texto** (Alerta
    / Atenção / Dica, nunca só cor), título, mensagem (o texto vem pronto
    do backend), a lista de itens com valor, quando houver, e um link de
    ação (Ver despesas, Abrir o simulador, Ver metas...).
  - **Lista**: mostra 4 e abre o resto com "Ver todas (N)". Sem
    sugestões, diz que as finanças do mês estão em dia.
- **Configurações** (`pages/Configuracoes.jsx`, rota `/configuracoes`;
  era "Meu Perfil" em `/perfil`, que agora redireciona pra
  `/configuracoes?aba=perfil`): item no menu lateral, e o "Olá, Fulano"
  da barra superior leva pra aba Meu perfil. A aba fica na URL
  (`?aba=perfil|aparencia|financas|dados|ajuda`), pra dar pra linkar
  direto e o voltar do navegador funcionar. No desktop as abas ficam
  numa coluna à esquerda; abaixo de 860px viram uma faixa horizontal.
  - **Meu perfil**: edita o nome (o `AuthContext` tem
    `atualizarUsuario` pra saudação mudar na hora), mostra o e-mail
    desabilitado e a data de criação da conta, troca de senha (atual,
    nova e confirmação) e botão Sair.
  - **Aparência e privacidade**: tema (Claro / Escuro / Automático) e
    ocultar valores. Os dois salvam no clique, sem botão.
  - **Alertas e simulador**: limites do comprometimento e padrões do
    simulador, num formulário com Salvar. Salva partindo das
    preferências já gravadas, então não desfaz o tema nem o ocultar.
  - **Dados**:
    - Exportar CSV de todo o histórico (`utils/csv.js`, o mesmo formato
      da exportação dos Relatórios).
    - Restaurar categorias padrão (`POST /categorias/predefinidas`,
      recria só as que faltam).
    - **Zona de perigo — excluir transações por período**: períodos
      prontos ou personalizado; "Ver o que será excluído" mostra a
      prévia (quantidade, totais, contribuições a metas que saem junto,
      parcelas mantidas); o botão vermelho só libera depois de digitar
      `EXCLUIR`; trocar o período descarta a prévia. Os valores aparecem
      mesmo com "ocultar valores" ligado, porque quem vai apagar precisa
      ver o que apaga.
  - **Ajuda**: Rever tutorial, perguntas frequentes e Sobre.
- **Tutorial de primeiro acesso** (`components/Tutorial.jsx`, montado no
  `Layout`): 7 passos (boas-vindas, Categorias, Transações, Dashboard,
  Metas, Relatórios e Simulador, Configurações), cada um dizendo onde
  fica no menu. Abre sozinho quando `preferencias.tutorialConcluido` é
  `false`. Pular, `Esc` ou "Começar a usar" fecham e marcam como visto
  na conta (`PUT /usuarios/me/preferencias/tutorial`), então não volta
  em outro computador. O padrão local é `true`, pra não piscar antes da
  resposta chegar. `abrirTutorial()` do `PreferenciasContext` reabre
  (aba Ajuda).
- **Preferências** (`contexts/PreferenciasContext.jsx`, provider em
  `main.jsx`, dentro do `AuthProvider`):
  - **Carregamento**: busca `GET /usuarios/me/preferencias` quando há
    token. Expõe `preferencias`, `salvar`, `ocultarValores`,
    `alternarOcultarValores`, `formatarMoeda(n)` (vira `R$ •••••` com
    ocultar ligado) e `ocultarValoresNoTexto(texto)` (mascara os `R$`
    dentro das mensagens das Sugestões).
  - **Onde os valores são ocultados**: Dashboard (cards, tooltips e
    eixo do gráfico), Transações, Metas e Sugestões usam `formatarMoeda`
    em vez de um `Intl.NumberFormat` local. A Simulação e o rodapé de
    mercado não ocultam, porque não são dados da pessoa.
  - **Olho na barra superior** (`Layout.jsx`): alterna e salva na hora
    (otimista; volta atrás se o backend recusar).
  - **Simulação**: abre com o prazo e o % do CDI das preferências.
  - **Alerta de comprometimento**: o texto do Dashboard usa os limites
    que vêm no indicador.
- **Tema escuro**:
  - **Variáveis**: todas as cores do app são variáveis CSS em
    `index.css`, uma por papel (`--superficie`, `--borda`, `--texto`,
    `--texto-suave`, `--primaria`, `--erro-texto`...).
    `:root[data-tema='escuro']` troca só os valores. **Cor nova em CSS
    usa uma variável, não um hex fixo.**
  - **O que fica fixo nos dois temas**: o verde e o vermelho de
    receita/despesa, os fundos translúcidos (`rgba`) e o rodapé de
    mercado, que é sempre escuro. O branco também, quando é cor de texto
    em botão colorido.
  - **Fundos de hover**: usam `--primaria-hover` e `--perigo-hover`,
    separados de `--primaria-forte` e `--erro-texto`. No escuro, o texto
    precisa clarear e o fundo do botão não.
  - **Gráficos**: eixo, grade, legenda e tooltip (`utils/graficos.js`)
    usam as variáveis. As séries da Simulação usam `--serie-1..3`, com
    os passos escuros da mesma paleta, validados contra daltonismo nos
    dois fundos.
  - **Aplicação**: `utils/tema.js` põe `data-tema` no `<html>`.
    `main.jsx` aplica o último tema guardado no `localStorage` antes de
    montar, então a tela não pisca e o login segue o tema. Depois o
    `PreferenciasContext` aplica o da conta e, em `SISTEMA`, acompanha o
    `prefers-color-scheme`.
  - **Onde escolher**: em Configurações → Aparência e privacidade
    (Claro / Escuro / Automático). Salva na hora.
  - **Impressão**: o tema escuro fica dentro de `@media screen`, então o
    que é impresso sai sempre claro.
- **Relatórios** (`pages/Relatorios.jsx`, rota `/relatorios`, serviço
  `services/relatorioService.js`): o item "em breve" do menu virou tela.
  - **Controles**: Mensal / Anual e o seletor do mês ou do ano. Abre no
    mês mais recente com lançamento, ignorando datas futuras, como o
    Dashboard.
  - **Resumo**: cards de receitas, despesas, saldo e taxa de poupança,
    com a variação sobre o período anterior. A seta e a cor dizem se a
    mudança é boa: despesa subir é ruim; receita, saldo e taxa subirem é
    bom. A taxa de poupança varia em pontos percentuais.
  - **Tabelas**: mês a mês (só no anual, com linha de total),
    despesas e receitas por categoria (valor, % do total, período
    anterior, variação) e as 5 maiores despesas.
  - **Exportar CSV**: as transações do período, geradas no navegador a
    partir de `GET /transacoes`. Usa `;`, vírgula decimal e BOM UTF-8
    pra abrir em colunas no Excel em português.
  - **Imprimir / PDF**: `window.print()`. O `@media print` em
    `Layout.module.css`, `RodapeMercado.module.css` e
    `Relatorios.module.css` esconde o menu, as barras e os controles.
  - Respeita "ocultar valores".
- **Mês inicial do Dashboard**: o "mês mais recente com lançamento"
  agora ignora datas futuras. Sem isso, as parcelas já agendadas faziam
  o Dashboard abrir no mês da última parcela.
