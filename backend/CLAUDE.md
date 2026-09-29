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
- **RN004 — Parcelamento**: ao parcelar uma transação, o sistema divide
  o valor igualmente entre as parcelas e gera os lançamentos futuros
  automaticamente. Sugere um limite máximo de parcelas com base na
  margem financeira disponível do usuário. *(ainda não implementado —
  sprint a definir)*
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
total. *(Sprint#3)*

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
- Excluir uma Transação (`DELETE /transacoes/{id}`) apaga em cascata
  suas `ContribuicaoMeta` (senão ficariam órfãs).
- Excluir uma `MetaFinanceira` apaga em cascata suas
  `ContribuicaoMeta`.

Não há re-validação quando a categoria da meta muda (`PUT /metas/{id}`
com `categoriaId` diferente) — contribuições já registradas continuam
contando pro progresso mesmo que a meta passe a apontar pra outra
categoria depois. Aceitável pelo escopo atual; revisar se isso virar
um problema real de uso.

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
- Ibovespa na brapi.dev — **exige token** (a API deixou de aceitar
  consultas sem autenticação). Configurar via `BRAPI_TOKEN` (env var)
  ou `brapi.token` em `application-local.properties`; sem token, o
  campo `ibovespa` da resposta vem `null` e o frontend simplesmente
  omite esse indicador — não é um erro.

Resposta cacheada em memória por 5 minutos (sem Spring Cache — campo
simples no service) pra não martelar as APIs externas a cada request
do rodapé.

### 6.5 Endpoints novos

- CRUD completo em `/metas` (`POST`, `GET`, `GET /{id}`, `PUT /{id}`,
  `DELETE /{id}`) e `POST /metas/{id}/contribuicoes` (ver 6.1.1,
  RN007).
- `GET /transacoes/evolucao-mensal` — totais de receita/despesa dos
  últimos 6 meses (sempre 6 posições, meses sem lançamento entram
  com total 0), pra alimentar o gráfico "Evolução nos Últimos 6
  Meses" do Dashboard.
- `GET /transacoes/despesas-por-categoria` — total de despesas
  agrupado por categoria no mês atual, pra alimentar o gráfico
  "Despesas por Categoria" do Dashboard.
- `GET /categorias/predefinidas` e `POST /categorias/predefinidas` —
  catálogo de categorias pré-definidas e adoção das que faltam (ver
  seção 6.3).
- `GET /indicadores/mercado` — Selic, Dólar e Ibovespa (ver seção 6.4).

---

## 7. Convenções de código

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

## 8. Como rodar localmente

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

## 9. Próximos passos (na ordem)

Sprint#2 concluída: `MetaFinanceira` com progresso via
`ContribuicaoMeta` (contribuição por Transação, limitada ao saldo dela
— RN007), gráficos do Dashboard, `icone` (Bootstrap Icons)/`cor` em
`Categoria`, categorias pré-definidas com seed silencioso e
indicadores de mercado (Selic/Dólar/Ibovespa).

Não avance para Parcelamento, Simulação de investimento completa
(RN005/RN006), Indicador de comprometimento de renda ou Sugestões sem
alinhar antes — seguem para sprints futuras.
