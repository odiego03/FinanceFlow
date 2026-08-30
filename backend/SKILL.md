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
- Nomes de campos e classe em português.
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
  `/transacoes`).

## Antes de implementar

Confirme com o usuário:
1. A entidade faz parte da Sprint atual? (ver `backend/CLAUDE.md`,
   seção de módulos e roadmap)
2. Alguma regra de negócio (RN) nova precisa ser documentada no
   `CLAUDE.md` antes de implementar, ou já está lá?

Não avance para módulos fora do escopo da sprint atual sem
confirmar antes.
