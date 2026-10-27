---
name: novo-crud-backend
description: Use ao adicionar um novo caso de uso/entidade no backend do FinanceFlow (Spring Boot). Garante que Model, Repository, Service e Controller sejam criados na ordem certa, seguindo o padrão em camadas e o Repository pattern já usados no projeto.
---

# Novo CRUD no backend (Spring Boot)

Sempre que for adicionar uma nova entidade/caso de uso, siga esta
ordem — cada camada depende da anterior:

## 1. Model (`com.financeflow.model`)

- Classe `@Entity` com `@Table(name = "...")` em snake_case plural.
- Getters/setters explícitos (sem Lombok, ver `backend/CLAUDE.md`).
- Nomes de classe, campos e métodos em português (ver seção 9 do
  `backend/CLAUDE.md`).
- Se houver enum, criar como arquivo próprio (ver `TipoMovimentacao`
  como referência).

## 2. Repository (`com.financeflow.repository`)

- Interface estendendo `JpaRepository<Entidade, Long>`.
- Métodos de consulta customizados por assinatura (query methods) —
  só usar `@Query` se o nome do método ficar longo/confuso demais.

## 3. Service (`com.financeflow.service`)

- É aqui que entram as regras de negócio (RN), nunca no Controller
  ou no Model.
- Depende da interface do Repository, nunca de detalhes de
  implementação.
- Validações de negócio (ex: unicidade, compatibilidade de tipo)
  lançam exceções customizadas — verificar se já existe uma exceção
  adequada antes de criar uma nova.

## 4. Controller (`com.financeflow.controller`)

- Endpoints REST, sem lógica de negócio — só recebe, delega ao
  Service e devolve a resposta.
- Seguir o padrão de rotas já usado (`/usuarios`, `/categorias`,
  `/transacoes`, `/metas`, `/indicadores`). Sub-recursos ficam sob o
  recurso pai (ex: `/metas/{id}/contribuicoes`,
  `/transacoes/importar/preview`).
- Erros de negócio viram status HTTP pelo `TratadorDeExcecoes`
  (`400`, `404`, `409`, `401`), com o campo `mensagem` que o frontend
  exibe. A exceção nova estende `NegocioException` e passa o
  `HttpStatus` no construtor — o tratador já pega todas, não precisa
  cadastrar nada lá.

## Casos especiais

- Lógica que não é CRUD e é reaproveitável (parsers, cálculos) vai em
  classe própria no pacote do Service, sem estado de banco — ver
  `service/extrato/` (um parser por banco) e `CalculadoraComprometimento`
  como referência. Cobrir com teste unitário em `src/test`.
- Respostas e requisições da API usam DTOs em `com.financeflow.dto`
  (records); não expor a entidade JPA direto.

## Antes de implementar

Confirme com o usuário:
1. A entidade faz parte da Sprint atual? (ver `backend/CLAUDE.md`,
   seção de módulos e a seção da sprint atual — hoje a 8, Sprint#4)
2. Alguma regra de negócio (RN) nova precisa ser documentada no
   `CLAUDE.md` antes de implementar, ou já está lá?

Não avance para módulos fora do escopo da sprint atual sem
confirmar antes.

Nomenclatura em português e comentários mínimos (só quando
essenciais, sem enfeite) valem para todas as camadas — ver seção 9
do `backend/CLAUDE.md`.
