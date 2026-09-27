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
- **RN007 — Progresso de Meta Financeira**: o progresso de uma meta é a
  soma dos aportes manuais registrados nela, mais — quando a meta tiver
  uma categoria vinculada — a soma das receitas lançadas nessa
  categoria. A categoria vinculada, se informada, deve ser do tipo
  RECEITA. O valor de progresso nunca é armazenado — é sempre calculado
  na hora, pra não ficar dessincronizado. *(Sprint#2)*

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

Sprint#1 concluída e homologada. Sprint#2 é só duas coisas: Meta
Financeira (caso de uso principal) e gráficos no Dashboard. Nada de
Parcelamento, Simulação, Indicador, Sugestões ou categorias
pré-definidas ainda.

### 6.1 `MetaFinanceira`

| Campo | Tipo | Regra |
|-------|------|-------|
| id | Long (PK, auto) | — |
| usuario | Usuario (`@ManyToOne`) | obrigatório |
| nome | String | ex: "Viagem pra praia" |
| valorAlvo | BigDecimal(10,2) | obrigatório |
| categoria | Categoria (`@ManyToOne`) | opcional — se informada, deve ser do tipo RECEITA (RN007) |
| dataAlvo | LocalDate | opcional |
| criadoEm | LocalDateTime | preenchido automaticamente na criação |

Não tem campo `valorAtual` — ver RN007 (seção 4): o progresso é
calculado na hora a partir dos `Aporte`s e, se houver categoria
vinculada, das receitas lançadas nela.

### 6.2 `Aporte`

| Campo | Tipo | Regra |
|-------|------|-------|
| id | Long (PK, auto) | — |
| meta | MetaFinanceira (`@ManyToOne`) | obrigatório |
| valor | BigDecimal(10,2) | obrigatório |
| data | LocalDate | obrigatório |
| criadoEm | LocalDateTime | preenchido automaticamente na criação |

Mesmo padrão de isolamento por usuário das entidades anteriores:
`MetaFinanceira` e `Aporte` só são visíveis/editáveis pelo dono.

### 6.3 Endpoints novos

- CRUD completo em `/metas` (`POST`, `GET`, `GET /{id}`, `PUT /{id}`,
  `DELETE /{id}`).
- `POST /metas/{id}/aportes` — registra um aporte manual.
- `DELETE /metas/{id}/aportes/{aporteId}` — remove um aporte
  (corrigir lançamento errado).
- `GET /transacoes/evolucao-mensal` — totais de receita/despesa dos
  últimos 6 meses (sempre 6 posições, meses sem lançamento entram
  com total 0), pra alimentar o gráfico "Evolução nos Últimos 6
  Meses" do Dashboard.
- `GET /transacoes/despesas-por-categoria` — total de despesas
  agrupado por categoria no mês atual, pra alimentar o gráfico
  "Despesas por Categoria" do Dashboard.

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

Sprint#1 concluída (repository/service/controller das 4 entidades,
plano de testes, Docker). Próximos passos são do Sprint#2:

1. `model`/`repository`/`service`/`controller` de `MetaFinanceira` e
   `Aporte`, seguindo o mesmo padrão em camadas já usado (isolamento
   por usuário, exceções customizadas + `TratadorDeExcecoes`).
2. RN007 no `MetaFinanceiraService`: validar que a categoria
   vinculada (quando informada) é do tipo RECEITA, e calcular o
   progresso (aportes + receitas da categoria) na leitura, nunca
   armazenado.
3. `GET /transacoes/evolucao-mensal` e
   `GET /transacoes/despesas-por-categoria` no `TransacaoController`/
   `TransacaoService`.

Não avance para Parcelamento, Simulação, Indicador, Sugestões ou
categorias pré-definidas sem alinhar antes — não fazem parte do
Sprint#2.
