# FinanceFlow — Contexto do Projeto

Sistema de gestão financeira pessoal, desenvolvido como Projeto Semestral
da disciplina Laboratório de Engenharia de Software (Fatec Ipiranga, ADS,
2026/2), em sintonia com o Trabalho de Graduação (TG).

Este documento existe para dar contexto completo a quem (ou o que) for
trabalhar no código — regras de negócio, arquitetura e o que já foi
decidido. Antes de sugerir mudanças de abordagem, leia tudo abaixo.

---

## 1. Stack tecnológica

- **Linguagem**: Java
- **Framework**: Spring Boot 3.x
- **Persistência**: JPA / Hibernate (pacote `jakarta.persistence`)
- **Build**: Maven
- **Banco de dados**: PostgreeSQL
- **Frontend**: React (consome a API via HTTP/JSON — fora do escopo deste
  backend, mas relevante pra entender o formato de resposta esperado)

---

## 2. Arquitetura

Arquitetura em camadas, com **padrão Repository**:

```
Controller  →  Service  →  Repository  →  Model / Banco de dados
```

- **Controller**: recebe a requisição HTTP, valida formato básico (campo
  existe, tipo correto) e delega para o Service. **Não contém regra de
  negócio.**
- **Service**: é onde vivem as regras de negócio (RN001 a RN006, ver
  seção 4). Orquestra chamadas a um ou mais Repositories.
- **Repository**: acesso a dados. No Spring, são interfaces que estendem
  `JpaRepository<Entidade, TipoId>` — o Spring Data gera a implementação
  de métodos básicos (`save`, `findById`, `findAll`, `deleteById`)
  automaticamente. Métodos de consulta customizados são declarados por
  assinatura (query methods) ou `@Query` quando necessário.
- **Model**: entidades JPA, mapeadas para as tabelas do MySQL.

Estrutura de pacotes:

```
com.financeflow
├── model        (entidades JPA)
├── repository   (interfaces JpaRepository)
├── service      (regras de negócio)
├── controller   (endpoints REST)
└── dto          (objetos de entrada/saída da API, quando necessário)
```

**Por quê Repository como interface e não classe concreta direto:** o
Service depende apenas do contrato (`interface`), nunca da implementação
concreta. Isso permite trocar a implementação (ex: usar um repositório
falso em testes) sem alterar o Service. No Spring, isso já vem "de
graça" ao estender `JpaRepository`.

---

## 3. Módulos do sistema (visão geral do produto completo)

O sistema é dividido em 8 módulos. Nem todos entram na Sprint#1 — a
lista completa serve para você entender onde cada peça futura vai se
encaixar.

| # | Módulo | Tipo | Depende de |
|---|--------|------|------------|
| 1 | Usuário | CRUD + Auth | — |
| 2 | Categoria | CRUD | Usuário |
| 3 | Transação (receita/despesa) | CRUD | Usuário, Categoria |
| 4 | Parcelamento | CRUD (dependente) | Transação |
| 5 | Meta financeira | CRUD | Usuário, Transação |
| 6 | Simulação de investimento | Processo (API externa) | API do Banco Central |
| 7 | Indicador de comprometimento de renda | Processo/Dashboard | Transação |
| 8 | Sugestões financeiras personalizadas | Processo | Indicador, Simulação |

Ordem de dependência: Autenticação e Categoria são pré-requisitos de
Transação; Transação é pré-requisito de Indicador e Metas; Simulação de
investimento é independente.

---

## 4. Regras de negócio (RN)

- **RN001 — Unicidade de e-mail**: cada e-mail pode estar associado a
  apenas um cadastro ativo de Usuário. Cadastro duplicado é rejeitado.
- **RN002 — Autenticação por token**: autenticação via JWT gerado no
  login. Toda rota protegida exige token válido, que expira em 8 horas.
- **RN003 — Classificação obrigatória**: toda Transação precisa de um
  `tipo` (RECEITA ou DESPESA) e uma Categoria — e o tipo da Transação
  deve ser compatível com o tipo da Categoria vinculada.
- **RN004 — Parcelamento**: ao parcelar uma despesa, o sistema divide
  o valor igualmente entre as parcelas (centavos que sobram na última)
  e gera os lançamentos futuros automaticamente. Com base na margem
  financeira disponível do usuário, sugere a menor quantidade de
  parcelas cuja parcela cabe no orçamento. *(Sprint#4, ver 8.1)*
- **RN005 — Simulação de investimento**: consulta a API pública do
  Banco Central (taxas Selic, CDB, Poupança) e calcula o rendimento
  projetado para valor e prazo informados. *(Sprint#4)*
- **RN006 — Sugestões personalizadas**: acionadas a partir dos alertas
  de risco do Indicador de comprometimento de renda e das taxas de
  mercado da Simulação de investimento. *(Sprint#4)*
- **RN007 — Progresso de Meta Financeira**: toda `MetaFinanceira` exige
  uma categoria vinculada (obrigatória), que deve ser do tipo RECEITA.
  O progresso NÃO é mais a soma automática de todas as receitas da
  categoria — é a soma das `ContribuicaoMeta` explicitamente
  registradas, cada uma amarrada a uma Transação. Ao lançar uma
  Transação RECEITA numa categoria vinculada a alguma meta, o frontend
  pergunta ao usuário quanto (se algo) daquele valor deve ir pra meta;
  o valor de uma contribuição nunca pode ultrapassar o saldo ainda não
  destinado da Transação (soma de contribuições daquela Transação,
  entre todas as metas, ≤ valor da Transação). O valor de progresso da
  meta nunca é armazenado nela — é sempre calculado na hora, somando
  as contribuições. *(Sprint#2)*

O **Indicador de comprometimento de renda** aplica a regra 50/30/20
(Warren e Tyagi): alerta de **atenção** quando despesas essenciais
atingem 50% da renda, e de **risco** ao atingir 80% de comprometimento
total (risco prevalece sobre atenção). *(Sprint#3)* Implementado em
`CalculadoraComprometimento` (regra pura, testada) +
`IndicadorComprometimentoService` (`GET /indicadores/comprometimento`).
"Essencial" é o campo `Categoria.essencial` (só despesa); quando é
`null` (categoria criada antes do campo), vale o padrão do catálogo de
pré-definidas pelo nome — `CategoriasPredefinidas.ehEssencial`, sem
migração de dados. Mês sem receita → nível `SEM_RENDA`, percentuais
`null`. Os limites comparam o percentual com 4 casas; a resposta é
arredondada pra 1 casa.

---

## 5. Sprint#1 — Escopo atual

Nesta sprint, **somente 4 classes de Model** serão implementadas.
Nada de Parcelamento, Meta, Simulação, Indicador ou Sugestões ainda —
isso é para sprints futuras.

### 5.1 `TipoMovimentacao` (enum)

Compartilhado entre `Categoria` e `Transacao`, para garantir que os
dois usem o mesmo conjunto de valores e facilitar a validação de
compatibilidade (RN003) no Service.

```
RECEITA, DESPESA
```

### 5.2 `Usuario`

| Campo | Tipo | Regra |
|-------|------|-------|
| id | Long (PK, auto) | — |
| nome | String | obrigatório |
| email | String (único) | RN001 |
| senhaHash | String | nunca armazenar senha em texto puro |
| criadoEm | LocalDateTime | preenchido automaticamente na criação |

### 5.3 `Categoria`

| Campo | Tipo | Regra |
|-------|------|-------|
| id | Long (PK, auto) | — |
| usuario | Usuario (`@ManyToOne`) | obrigatório — categoria pertence a um usuário |
| nome | String | ex: Alimentação, Moradia |
| tipo | TipoMovimentacao | RECEITA ou DESPESA |

Cada usuário só enxerga/edita/exclui as próprias categorias — as
operações de listar, buscar por id, atualizar e excluir filtram pelo
usuário autenticado (via token JWT). Acessar categoria de outro
usuário retorna `404` (não `403`), pra não revelar se o registro
existe.

### 5.4 `Transacao`

| Campo | Tipo | Regra |
|-------|------|-------|
| id | Long (PK, auto) | — |
| usuario | Usuario (`@ManyToOne`) | obrigatório |
| categoria | Categoria (`@ManyToOne`) | obrigatório |
| tipo | TipoMovimentacao | deve bater com o tipo da categoria vinculada (validação no Service) |
| valor | BigDecimal(10,2) | obrigatório |
| descricao | String | opcional |
| data | LocalDate | obrigatório |
| criadoEm | LocalDateTime | preenchido automaticamente na criação |

Importante: nesta sprint, uma Transação é sempre um lançamento único —
sem parcelamento. Não criar campos ou lógica relacionados a parcelas
ainda.

---

## 6. Sprint#2 — Escopo atual

Sprint#1 concluída e homologada. Sprint#2 cobre: Meta Financeira (caso
de uso principal), gráficos no Dashboard, categorias pré-definidas com
ícone/cor, e um módulo de indicadores de mercado (Selic, Dólar,
Ibovespa) para o rodapé do frontend. Nada de Parcelamento, Simulação
de investimento completa (RN005/RN006), Indicador de comprometimento
de renda ou Sugestões ainda — essas seguem para sprints futuras.

### 6.1 `MetaFinanceira`

| Campo | Tipo | Regra |
|-------|------|-------|
| id | Long (PK, auto) | — |
| usuario | Usuario (`@ManyToOne`) | obrigatório |
| nome | String | ex: "Viagem pra praia" |
| valorAlvo | BigDecimal(10,2) | obrigatório |
| categoria | Categoria (`@ManyToOne`) | obrigatória — deve ser do tipo RECEITA (RN007) |
| dataAlvo | LocalDate | opcional |
| criadoEm | LocalDateTime | preenchido automaticamente na criação |

Não tem campo `valorAtual` — ver RN007 (seção 4): o progresso é
sempre calculado na hora, a partir da soma das `ContribuicaoMeta`
vinculadas a ela (ver 6.1.1).

Mesmo padrão de isolamento por usuário das entidades anteriores:
`MetaFinanceira` só é visível/editável pelo dono.

> Havia uma entidade `Aporte` (lançamento manual de progresso, livre,
> sem vínculo com uma Transação específica) numa versão anterior desta
> mesma sprint — foi removida em favor de `ContribuicaoMeta` (6.1.1),
> que amarra cada contribuição a uma Transação real e limita o valor
> ao saldo dela, em vez de deixar o usuário digitar qualquer valor a
> qualquer momento.

#### 6.1.1 `ContribuicaoMeta`

| Campo | Tipo | Regra |
|-------|------|-------|
| id | Long (PK, auto) | — |
| meta | MetaFinanceira (`@ManyToOne`) | obrigatório |
| transacao | Transacao (`@ManyToOne`) | obrigatório |
| valor | BigDecimal(10,2) | obrigatório, > 0 |
| criadoEm | LocalDateTime | preenchido automaticamente na criação |

Registrada via `POST /metas/{id}/contribuicoes` (`transacaoId` +
`valor`). `MetaFinanceiraService.registrarContribuicao` valida: a
Transação pertence ao usuário autenticado, é do tipo RECEITA, está na
mesma categoria da meta, `valor` não ultrapassa o saldo ainda livre da
Transação (`valor da Transação` − soma de todas as contribuições já
feitas a partir dela, para qualquer meta) **e** `valor` não ultrapassa
o quanto falta pra bater `valorAlvo` da meta (`valorAlvo` − soma das
contribuições já feitas a essa meta) — uma meta nunca recebe mais do
que o próprio alvo. Isso permite que uma única Transação alimente mais
de uma meta, desde que a soma não passe do valor lançado.

`TransacaoResposta` inclui `valorContribuidoMetas` (soma já destinada
a metas a partir daquela Transação) — o frontend usa isso pra saber
quanto ainda pode ser contribuído numa transação já existente (ver
`frontend/CLAUDE.md`, botão de meta na tela de Transações).

Consequências em cascata, tratadas em `TransacaoService`:
- Editar uma Transação (`PUT /transacoes/{id}`) pra um `valor` menor
  que o total já contribuído a partir dela lança
  `ContribuicaoInvalidaException` (400) — não deixa o saldo negativo.
- Editar uma Transação que já tem contribuições: `tipo` e `categoria`
  não podem mudar (400) — a contribuição só vale pra receita da
  categoria da meta. Pra corrigir, o usuário exclui a transação (as
  contribuições saem junto) e lança de novo.
- Excluir uma Transação (`DELETE /transacoes/{id}`) apaga em cascata
  suas `ContribuicaoMeta` (senão ficariam órfãs), em `@Transactional`.
- Excluir uma `MetaFinanceira` apaga em cascata suas
  `ContribuicaoMeta`, em `@Transactional`.

Em `MetaFinanceiraService.atualizar`: `valorAlvo` não pode ficar menor
que o já contribuído, e a `categoria` não pode mudar se a meta já tem
contribuições (as duas dão 400) — senão o progresso passaria de 100%
ou contaria receitas de uma categoria que não é mais a da meta.

### 6.2 `Categoria` — `icone` e `cor`

`Categoria` ganhou dois campos opcionais (`nullable`): `icone` e `cor`
(hex, ex: "#f97316"). `icone` guarda o **nome da classe do Bootstrap
Icons sem o prefixo `bi-`** (ex: "cup-hot-fill" → renderizado no
frontend como `<i class="bi bi-cup-hot-fill">`), não mais emoji — ver
6.3. Usados pelo seletor de categoria em cards no frontend. Categorias
criadas antes dessa mudança (com emoji no `icone`, de uma versão
anterior) ficam sem ícone visível até serem editadas — o valor salvo
não é um nome de classe válido, então nada renderiza; não há migração
automática desses dados.

### 6.3 Categorias pré-definidas

`CategoriasPredefinidas` (`service/CategoriasPredefinidas.java`) é um
catálogo estático (~18 itens) de categorias comuns de receita/despesa,
cada uma com `nome`, `tipo`, `icone` (classe do Bootstrap Icons) e
`cor`.

- Todo usuário novo recebe automaticamente as categorias do catálogo
  no cadastro (`UsuarioService.cadastrar` chama
  `CategoriaService.semearPredefinidas`).
- `GET /categorias/predefinidas` expõe o catálogo (sem `id`/`usuario`).
- `POST /categorias/predefinidas` adiciona, para o usuário autenticado,
  as categorias do catálogo que ele ainda não tem (comparação por
  `nome`+`tipo`). Não tem botão correspondente no frontend — a tela de
  Categorias chama esse endpoint silenciosamente ao carregar (ver
  `frontend/CLAUDE.md`), pra retrocompatibilizar usuários criados
  antes dessa mudança sem exigir ação manual.

### 6.4 Indicadores de mercado (Selic, Dólar, Ibovespa)

`IndicadorMercadoService`/`IndicadorMercadoController`
(`GET /indicadores/mercado`, autenticado) consultam:

- Selic (série 432) e Dólar comercial (série 1) na API SGS do Banco
  Central — gratuita, sem chave.
- Ibovespa na API pública do Yahoo Finance
  (`query1.finance.yahoo.com/v8/finance/chart/^BVSP`) — gratuita, sem
  chave nem cadastro, só exige um header `User-Agent` (sem ele o Yahoo
  responde `429`). Foi usada no lugar da brapi.dev porque essa passou
  a exigir token de autenticação, o que exigiria distribuir um segredo
  compartilhado pra todo mundo que rodasse o projeto — o Yahoo funciona
  pra qualquer pessoa que rodar o backend, sem configuração nenhuma.
  Resposta parseada como `JsonNode` (não um DTO tipado) porque o JSON
  do Yahoo tem dezenas de campos irrelevantes — só `chart.result[0]
  .meta.regularMarketPrice` importa.
- Se qualquer uma das 3 chamadas falhar (rede instável, API fora do
  ar, mudança de formato), aquele campo específico vem `null` na
  resposta — o frontend simplesmente omite esse indicador, não é
  tratado como erro.

Resposta cacheada em memória por 5 minutos (sem Spring Cache — campo
simples no service) pra não martelar as APIs externas a cada request
do rodapé.

### 6.5 Endpoints novos

- CRUD completo em `/metas` (`POST`, `GET`, `GET /{id}`, `PUT /{id}`,
  `DELETE /{id}`) e `POST /metas/{id}/contribuicoes` (ver 6.1.1,
  RN007).
- `GET /transacoes/evolucao-mensal?meses=N` (padrão 6, limitado a
  1–24) — totais de receita/despesa dos últimos N meses até o mês
  atual (sempre N posições, meses sem lançamento entram com total 0),
  pro gráfico de evolução do Dashboard.
- `GET /transacoes/por-categoria?tipo=DESPESA|RECEITA&mes=AAAA-MM`
  (tipo padrão DESPESA; sem `mes` = todo o período) — total agrupado
  por categoria (agrupa por id, não por nome), ordenado do maior pro
  menor, com `categoriaId`, `categoriaNome`, `cor` e `total`, pro
  gráfico por categoria do Dashboard. Substituiu
  `/transacoes/despesas-por-categoria` (que era fixo em despesas do mês
  atual). Parâmetro com formato inválido devolve `400`
  (`MethodArgumentTypeMismatchException` em `TratadorDeExcecoes`).
- `GET /categorias/predefinidas` e `POST /categorias/predefinidas` —
  catálogo de categorias pré-definidas e adoção das que faltam (ver
  seção 6.3).
- `GET /indicadores/mercado` — Selic, Dólar e Ibovespa (ver seção 6.4).

---

## 7. Sprint#3 — Escopo atual

Foco principal: **importação automática de extrato** (CSV do Nubank ou
Itaú) pra cadastrar Transações em lote, com uma camada de
"categorização aprendida" que lembra qual categoria o usuário escolheu
pra cada descrição de lançamento.

Regras importantes dessa feature:

- **Nada é persistido sem revisão do usuário.** O fluxo é em duas
  fases — `preview` (só lê e devolve o que seria importado, não
  grava nada) e `confirmar` (só aí cria as Transações de verdade).
- **O arquivo CSV em si nunca é persistido** — é lido direto do
  `MultipartFile` (via `InputStream`) e descartado assim que o preview
  é gerado. Nem disco, nem banco, nem pasta temporária. O único
  artefato que sobrevive é a própria `Transacao` criada (e a regra de
  categorização aprendida).
- **O sistema pré-preenche a categoria com o melhor palpite e o
  usuário só revisa.** Ordem: regra aprendida (7.2) → palavra-chave
  (7.2.1) → pendente. Toda sugestão vem com a origem
  (`origemSugestao`) pro frontend mostrar o quanto confiar nela; nada é
  gravado sem o usuário confirmar. Sem fuzzy matching (distância de
  texto etc.) — os palpites são só por chave exata ou palavra inteira
  do dicionário, pra serem previsíveis.
- Bancos suportados: **Nubank** e **Itaú**, cada um com seu parser
  dedicado (layout nativo, não um formato CSV genérico) — usuário
  escolhe o banco ao subir o arquivo.
- Duplicata é detectada no preview e sinalizada — o frontend desmarca
  essas linhas por padrão, mas o usuário pode re-incluir manualmente.
  Linha **com** identificador (Nubank — coluna `Identificador`, UUID
  por lançamento, salvo em `Transacao.identificadorExterno`): é
  duplicada se já existe transação com o mesmo identificador, ou uma
  sem identificador (importada antes da coluna existir) com mesma
  `data` + `valor` + `descricao`. Linha **sem** identificador (Itaú):
  só `data` + `valor` + `descricao`. Assim duas compras iguais no mesmo
  dia, cada uma com seu identificador, não se marcam como duplicadas.
  O preview carrega as transações do intervalo de datas do arquivo numa
  consulta só (`TransacaoRepository.buscarResumoParaDuplicata`) e
  compara em memória — antes era um `exists` por linha.

### 7.1 Parsers de extrato (`service/extrato/`)

`ExtratoParser` (interface) → `List<LinhaExtratoBruta>` (record
interno: `data, descricao, valorComSinal` — sinal negativo vira
DESPESA, positivo vira RECEITA, conversão feita uma camada acima dos
parsers pra não duplicar essa lógica em cada banco).

- `NubankExtratoParser` (**validado com extrato real**): colunas
  `Data`/`Valor`/`Identificador`/`Descrição`, data `DD/MM/AAAA` (ISO
  também aceita), valor decimal com ponto, UTF-8 com ou sem BOM.
  Separador detectado pela linha de cabeçalho (vírgula, `;` ou tab),
  porque abrir e salvar o arquivo numa planilha pode trocar o
  separador. `Identificador` é um UUID único por lançamento, ainda não
  usado (candidato a substituir a detecção de duplicata por
  data+valor+descrição). Testes em `NubankExtratoParserTest`.
- `ItauExtratoParser`: CSV separado por `;`, pode ter linhas de
  metadados antes da tabela real (localizadas heuristicamente
  procurando a primeira linha com "data" e "valor"), colunas
  `data`/`lançamento`/`valor`, data `DD/MM/AAAA`, decimal com vírgula.

> **Risco conhecido (só Itaú)**: o layout do Itaú (nomes de coluna,
> separador, encoding) foi implementado com base no formato mais comum
> conhecido, não a partir de um arquivo real exportado.
> Se um usuário real tiver erro ao importar, o primeiro passo é
> comparar o CSV dele com o que os parsers esperam — ver
> `NubankExtratoParser`/`ItauExtratoParser` (comentário no topo de
> cada classe documenta o layout assumido).

### 7.2 Categorização aprendida — `RegraCategorizacao`

| Campo | Tipo | Regra |
|-------|------|-------|
| id | Long (PK, auto) | — |
| usuario | Usuario (`@ManyToOne`) | obrigatório |
| descricaoNormalizada | String | obrigatório |
| categoria | Categoria (`@ManyToOne`) | obrigatório |

Constraint única em `(usuario_id, descricao_normalizada)`. Apesar do
nome da coluna, o valor guardado é a **chave** da descrição
(`SugestorCategoria.chaveDe`): sem acento, maiúsculas, espaços
colapsados, e cortada no primeiro segmento `" - "` que for dado de
documento/banco (CPF mascarado `•••`, CNPJ, `Agência:`, código de
banco `(0260)`), além de uma data no fim (`12/09`). Ex: `Transferência
enviada pelo Pix - João - •••.123.456-•• - NU PAGAMENTOS ...` →
`TRANSFERENCIA ENVIADA PELO PIX - JOAO`. Assim o mesmo favorecido cai
na mesma regra mesmo com agência/conta diferentes. A operação
("enviada"/"recebida") fica na chave de propósito, pra separar Pix
enviado de Pix recebido pro mesmo favorecido. (Regras gravadas antes
dessa mudança, com a descrição inteira, simplesmente deixam de casar —
sem migração, a feature ainda não tinha ido pra `main`.)

A cada confirmação de importação, toda linha confirmada faz
upsert da regra correspondente (cria se não existe, atualiza a
categoria se já existia) — é assim que o sistema "aprende": na
próxima importação com a mesma chave, a categoria já vem sugerida
(`origemSugestao = APRENDIDA`), e só é aplicada se o tipo da categoria
aprendida bater com o tipo derivado do sinal da linha nova.

#### 7.2.1 Sugestão por palavra-chave

Sem regra aprendida, `SugestorCategoria.sugerirNomeCategoria` procura
na chave (não na descrição inteira — senão o banco do favorecido, ex:
"MERCADO PAGO", viraria Alimentação) uma palavra inteira de um
dicionário fixo que aponta pra uma das categorias pré-definidas (ex:
IFOOD/MERCADO/PADARIA → Alimentação, UBER/99/AUTOPASS → Transporte,
FARMACIA → Saúde, ESTORNO → Reembolsos). O dicionário filtra pelo
tipo da linha, e a categoria é procurada nas categorias do próprio
usuário por nome + tipo — se ele apagou ou renomeou a pré-definida,
não há sugestão (`origemSugestao = PALAVRA_CHAVE` quando acha). Termos
mais específicos ficam antes dos genéricos no dicionário ("MERCADO
LIVRE" → Compras antes de "MERCADO" → Alimentação). Testes em
`SugestorCategoriaTest`.

### 7.3 Endpoints

- `POST /transacoes/importar/preview` (multipart: `arquivo` +
  `banco` = `NUBANK`/`ITAU`) → `List<LinhaImportacaoResposta>` (data,
  descricao, chave, valor, tipo, categoriaIdSugerida,
  categoriaNomeSugerida, origemSugestao = `APRENDIDA`/`PALAVRA_CHAVE`/
  `null`, duplicada). Não persiste nada.
- `confirmar` devolve `{transacoesCriadas, transacoes}` — a lista das
  Transações criadas (com `valorContribuidoMetas = 0`). A importação
  **nunca** cria `ContribuicaoMeta` sozinha (RN007: progresso de meta
  só por contribuição explícita); o frontend usa essa lista pra
  oferecer, num passo opcional depois da confirmação, destinar as
  receitas importadas às metas — via o mesmo
  `POST /metas/{id}/contribuicoes` do lançamento manual, com as mesmas
  validações.
- `confirmar` roda em `@Transactional`: se uma linha falhar, nenhuma
  Transação nem regra é gravada.
- `POST /transacoes/importar/confirmar` (JSON `{"linhas": [...]}` —
  **tem que vir embrulhado nesse objeto**, não uma lista solta: um
  `@Valid` direto num `List<T>` como `@RequestBody` não cascade a
  validação pros elementos da lista, foi um bug real encontrado e
  corrigido durante a implementação) → cria as Transações e
  aprende/atualiza as `RegraCategorizacao` correspondentes.

`spring.servlet.multipart.max-file-size`/`max-request-size` subidos
pra 5MB em `application.properties` (default do Spring Boot é 1MB,
baixo demais pra um extrato com muitos lançamentos).

---

## 8. Sprint#4 — Escopo atual

Última sprint: Parcelamento (RN004), Simulação de investimento (RN005),
Sugestões personalizadas (RN006), importação do Itaú com arquivo real
e encerramento. Tudo numa branch só (`feature/sprint4`), com um PR
único pra `main`.

### 8.1 `Parcelamento` (RN004)

| Campo | Tipo | Regra |
|-------|------|-------|
| id | Long (PK, auto) | — |
| usuario | Usuario (`@ManyToOne`) | obrigatório |
| categoria | Categoria (`@ManyToOne`) | obrigatória — deve ser do tipo DESPESA |
| descricao | String | obrigatória, até 190 caracteres (sobra espaço pro sufixo " (n/N)") |
| valorTotal | BigDecimal(10,2) | obrigatório, > 0 |
| quantidadeParcelas | Integer | 2 a 60 |
| dataPrimeiraParcela | LocalDate | obrigatória |
| criadoEm | LocalDateTime | preenchido automaticamente na criação |

`Transacao` ganhou `parcelamento` (`@ManyToOne`, nullable) e
`numeroParcela` (nullable): só as parcelas geradas têm esses campos.

- **Criar** (`POST /parcelamentos`, `@Transactional`) gera uma
  Transação DESPESA por mês, a partir de `dataPrimeiraParcela`
  (`plusMonths`, então dia 31 vira o último dia dos meses mais curtos),
  com descrição `"<descrição> (n/N)"`. Divisão em
  `CalculadoraParcelamento.dividir`: cada parcela arredondada pra baixo
  em centavos e o que sobra vai na última. A soma sempre bate com o
  total.
- **Parcela não é editada nem excluída sozinha**: `PUT` e `DELETE` em
  `/transacoes/{id}` de uma parcela dão `400`
  (`ParcelamentoInvalidoException`), senão a soma deixaria de bater com
  o total. Pra corrigir, exclui o parcelamento e lança de novo.
- **Excluir** (`DELETE /parcelamentos/{id}`, `@Transactional`): apaga
  as parcelas com data depois de hoje. As já vencidas ficam como
  transações comuns (perdem o vínculo e o `numeroParcela`, mas mantêm
  o "(n/N)" na descrição).
- **Sugestão de parcelas** (`GET /parcelamentos/sugestao?valorTotal=&dataPrimeiraParcela=`):
  - margem livre = renda média − despesas médias − parcelas já agendadas
  - as médias são dos **3 meses completos anteriores ao mês atual**
    (o mês atual ainda está pela metade), sempre divididas por 3
  - as despesas médias **não** contam parcelas. O que ainda vai ser
    pago entra como "parcelas já agendadas": a soma das parcelas
    existentes no mês mais carregado a partir do mês da primeira parcela
    nova. Assim parcelamento já encerrado não pesa, e o que está em
    andamento não conta duas vezes.
  - Sem receita nos 3 meses: `margemLivre` e `quantidadeMinimaParcelas`
    vêm `null`.
  - **Decisão sobre o texto da RN004**: a margem limita o *valor* da
    parcela, não a quantidade (mais parcelas = parcela menor). Então o
    "limite" sugerido é a **menor quantidade de parcelas cuja parcela
    cabe na margem** (`CalculadoraParcelamento.quantidadeMinimaQueCabe`,
    comparando a última parcela, que é a maior). Se nem em 60x cabe,
    vem `null`. A sugestão é só informativa: o usuário pode parcelar
    acima da margem.

Testes em `CalculadoraParcelamentoTest`.

### 8.2 Simulação de investimento (RN005)

Sem entidade: `POST /simulacoes` só calcula e devolve, nada é gravado
(por isso responde `200`, não `201`).

- **Taxas**: `IndicadorMercadoService.obterTaxasInvestimento()` busca na
  API SGS do BCB a Selic meta (432, % a.a.), o CDI anualizado base 252
  (4389, % a.a.) e a rentabilidade mensal da poupança nova (195, % a.m.,
  já com a TR). Cache de 1 hora, separado do rodapé. Se uma série falhar,
  mantém o último valor obtido dela; com alguma taxa faltando, o cache
  não vale e a próxima chamada tenta de novo. Sem valor nenhum, o
  cenário volta `disponivel: false`, com os valores `null`.
  `GET /simulacoes/taxas` expõe as taxas pro cabeçalho da tela.
- **Cenários**:
  - Poupança: taxa mensal do BCB direto, isenta de IR.
  - CDB: CDI × `percentualCdi` (50 a 200, padrão 100).
  - Tesouro Selic: Selic meta, **sem** a taxa de custódia da B3 (0,20%
    a.a.). Fica documentado como simplificação.
  - Taxa anual → mensal por equivalência: `(1 + a)^(1/12) − 1`.
- **Cálculo** (`CalculadoraInvestimento`, pura):
  - juros compostos mês a mês; o valor inicial entra no mês 0 e o
    aporte no **fim** de cada mês (o último aporte não rende);
  - IR regressivo calculado **por depósito**, pelo tempo que cada um
    ficou aplicado: até 6 meses 22,5%, até 12 meses 20%, até 24 meses
    17,5%, acima disso 15%. É como a Receita cobra: o aporte do mês 11
    de uma aplicação de 12 meses paga 22,5%, não 20%;
  - IOF ignorado (prazo mínimo de 1 mês ≈ 30 dias, quando ele já é
    zero).
- **Resposta**: total investido, os 3 cenários (taxa anual efetiva,
  bruto, IR, líquido, rendimentos), `melhorCenario` (maior valor
  líquido entre os disponíveis) e `evolucao`, com o saldo **bruto** de
  cada cenário e o valor investido mês a mês, pro gráfico.
- Valor inicial e aporte zerados ao mesmo tempo → `400`
  (`SimulacaoInvalidaException`).

Testes em `CalculadoraInvestimentoTest`.

### 8.3 Sugestões personalizadas (RN006)

Sem entidade: `GET /sugestoes?mes=AAAA-MM` (padrão: mês atual) calcula
na hora. As regras ficam em `RegrasSugestao`, uma classe pura que
devolve a sugestão já com o texto pronto. `SugestaoService` junta os
dados e chama as regras. Cada sugestão tem:
- `tipo`, `severidade` (`ALERTA` > `ATENCAO` > `DICA`, a ordem da lista);
- `titulo`, `mensagem`;
- `valor`: o número principal;
- `itens`: lista `{nome, valor}`, ex: as categorias que mais pesaram.

As regras de **comprometimento e sobra** usam o mês pedido (mesma conta
do Indicador, via `CalculadoraComprometimento`). As de **metas e
parcelas** olham pra frente, a partir de hoje.

| Tipo | Quando | O que diz |
|------|--------|-----------|
| `REDUZIR_GASTOS` (alerta) | nível `RISCO` | quanto reduzir pra ficar abaixo de 80% (`despesas − 80% da renda + R$ 0,01`) + as 3 não essenciais que mais pesaram |
| `REDUZIR_ESSENCIAIS` (atenção) | essenciais ≥ 50% | quanto cortar nas essenciais ou quanto a renda precisaria crescer (essenciais × 2 − renda) + as 3 essenciais que mais pesaram |
| `SEM_RENDA` (atenção) | despesa sem nenhuma receita no mês | pede pra lançar as receitas |
| `INVESTIR_SOBRA` (dica) | renda − despesas > 0 | quanto a sobra renderia investida todo mês por 12 meses no melhor cenário da Simulação (sem as taxas do BCB, sai sem a projeção) |
| `META_VENCIDA` (alerta) | data-alvo passou e não concluiu | quanto falta |
| `META_ATRASADA` (atenção) | abaixo do ritmo linear entre a criação e a data-alvo | o esperado × o atual, e quanto contribuir por mês até a data |
| `META_NO_PRAZO` (dica) | no ritmo | quanto contribuir por mês até a data (meses contados com o atual e o da data-alvo) |
| `PARCELAS_ACIMA_DA_MARGEM` (alerta) | margem livre do Parcelamento (8.1) negativa com parcelas agendadas | quanto falta por mês + os parcelamentos em andamento |

Detalhes que não são óbvios:
- **Por que existe `REDUZIR_ESSENCIAIS`**: o README previa "apontar as
  não essenciais" também no nível `ATENCAO`. Só que `ATENCAO` vem das
  essenciais ≥ 50%, e cortar não essencial não muda esse percentual.
  Por isso a regra separada.
- **Atraso de meta**: só é cobrado depois de 30 dias da criação. Antes
  disso, qualquer meta com zero contribuído apareceria como atrasada no
  dia seguinte.

Testes em `RegrasSugestaoTest`.

### 8.4 Perfil, preferências e exclusão em massa

**Perfil**:
- `PUT /usuarios/me` muda só o `nome`. O e-mail é o login e o
  `subject` do JWT, então não muda.
- `PUT /usuarios/me/senha` confere a `senhaAtual` com o BCrypt e exige
  pelo menos 6 caracteres na nova. Senha atual errada dá **400**
  (`SenhaAtualIncorretaException`), **não 401**: o frontend trata
  qualquer `401` de rota autenticada como sessão expirada e desloga.

**`PreferenciasUsuario`** (`preferencias_usuarios`, 1:1 com `Usuario`):

| Campo | Faixa | Padrão |
|-------|-------|--------|
| ocultarValores | — | false |
| limiteEssencial | 20–90 (%) | 50 |
| limiteTotal | 30–100 (%), maior que o essencial | 80 |
| simuladorPercentualCdi | 50–200 | 100 |
| simuladorPrazoMeses | 1–360 | 12 |

- O registro só é criado no primeiro `PUT`. Até lá, o
  `GET /usuarios/me/preferencias` devolve os padrões
  (`PreferenciasService.buscarPorUsuarioId`), sem migração pra usuários
  antigos.
- Os limites personalizados entram em
  `CalculadoraComprometimento.calcular(..., limiteEssencial, limiteTotal)`
  (a versão de 4 argumentos usa 50/80). O Indicador e as Sugestões leem
  as preferências do usuário.
- `IndicadorComprometimentoResposta` devolve os limites usados, pro
  frontend explicar o alerta com o número certo.
- Os textos das Sugestões também usam esses limites ("abaixo de 70%").
- Ocultar valores e os padrões do simulador são só de exibição: o
  backend guarda, quem aplica é o frontend.

**Exclusão em massa** (`TransacaoService.previaExclusaoPorPeriodo` /
`excluirPorPeriodo`):
- `GET /transacoes/exclusao-em-massa/previa` e
  `DELETE /transacoes/exclusao-em-massa`, os dois com
  `dataInicio`/`dataFim` opcionais. Vazio = sem limite daquele lado; os
  dois vazios = todo o histórico. Início depois do fim dá 400.
- **Parcelas nunca entram** (RN004: parcela só sai excluindo o
  parcelamento). Vêm contadas em `parcelasMantidas`.
- As `ContribuicaoMeta` das transações apagadas saem junto, como no
  delete unitário.
- `@Transactional` e `deleteAllInBatch`: uma consulta por tabela, em
  vez de uma por linha, porque cada ida ao Neon paga latência.
- As `RegraCategorizacao` aprendidas ficam.
- A prévia e a exclusão usam a mesma seleção (`selecionarParaExclusao`)
  e devolvem o mesmo formato.

---

## 9. Convenções de código

- Nomes de classes, métodos, variáveis, parâmetros e pacotes internos
  em **português**, em todo o código (não só nas entidades) — ex:
  `Usuario`, `senhaHash`, `buscarPorEmail`, não `User`/`passwordHash`/
  `findByEmail`.
- Tabelas no banco em `snake_case` e plural (`usuarios`, `categorias`,
  `transacoes`), via `@Table(name = "...")`.
- Sem uso de Lombok por enquanto — getters/setters explícitos. Isso
  pode ser revisto depois, mas não introduzir a dependência sem
  combinar com o grupo antes.
- Comentários só quando essenciais (explicar um "porquê" não óbvio —
  uma decisão, uma regra de negócio complexa, um workaround). Não
  comentar o código inteiro, não comentar o óbvio, e não enfeitar
  (sem blocos decorativos, sem repetir o que o nome já diz). Se não
  for necessário, não comente.

---

## 10. Como rodar localmente

O banco Postgres é compartilhado (hospedado no Neon) — ninguém precisa
instalar Postgres localmente.

1. Peça a connection string do banco compartilhado pra quem já tem
   acesso (não fica em nenhum arquivo versionado).
2. Crie `backend/src/main/resources/application-local.properties`
   (já está no `.gitignore`, nunca é commitado) com:
   ```properties
   spring.datasource.url=jdbc:postgresql://<host>:<porta>/<banco>?sslmode=require
   spring.datasource.username=<usuario>
   spring.datasource.password=<senha>
   ```
3. Empacote e rode o jar com o profile `local` (mais confiável que
   `spring-boot:run`, que se mostrou instável em alguns ambientes):
   ```
   ./mvnw package -DskipTests
   java -jar target/financeflow-backend-0.1.0.jar --spring.profiles.active=local
   ```

As tabelas são criadas/atualizadas automaticamente pelo Hibernate
(`spring.jpa.hibernate.ddl-auto=update`) — não precisa rodar SQL
manual.

---

## 11. Próximos passos (na ordem)

Sprint#2 concluída: `MetaFinanceira` com progresso via
`ContribuicaoMeta` (contribuição por Transação, limitada ao saldo dela
— RN007), gráficos do Dashboard, `icone` (Bootstrap Icons)/`cor` em
`Categoria`, categorias pré-definidas com seed silencioso e
indicadores de mercado (Selic/Dólar/Ibovespa).

Sprint#3 concluída: importação de extrato do Nubank (validada com
extrato real) com categorização aprendida, sugestão por palavra-chave,
duplicata por `Identificador` e destinação às metas (seção 7);
Indicador de comprometimento de renda (seção 4); filtros no Dashboard
e em Transações; correções da auditoria (`@Transactional`, `409` ao
excluir categoria em uso, consistência de contribuições ao editar
transação/meta, `401` + logout automático, fim do N+1).

Sprint#4 (última): Parcelamento (RN004), Simulação de investimento
(RN005), Sugestões personalizadas (RN006), **validação do parser do
Itaú com arquivo real** (movida da Sprint#3 — risco conhecido em 7.1),
testes dos Services e encerramento. O checklist completo das duas sprints está na seção
"Roadmap" do `README.md` — ele é a fonte de verdade do planejamento.
