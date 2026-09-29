# FinanceFlow

Sistema de gestão financeira pessoal — Projeto Semestral da disciplina
Laboratório de Engenharia de Software (Fatec Ipiranga, ADS, 2026/2).

## Stack

- **Backend**: Java 17+, Spring Boot 3, JPA/Hibernate, Maven
- **Frontend**: React
- **Banco de dados**: PostgreSQL (hospedado no Neon, compartilhado entre a equipe — ninguém precisa instalar Postgres local)
- **Infraestrutura**: Docker + Docker Compose

## Estrutura do repositório

```
financeflow/
├── backend/     # API REST em Spring Boot
├── frontend/    # Aplicação React
└── README.md
```

## Como rodar o backend

O banco é compartilhado (Neon) — não precisa instalar Postgres local.

1. Peça a connection string do banco compartilhado pra quem já tem acesso (não fica em nenhum arquivo versionado).
2. Crie `backend/src/main/resources/application-local.properties` (já está no `.gitignore`, nunca é commitado):
   ```properties
   spring.datasource.url=jdbc:postgresql://<host>:<porta>/<banco>?sslmode=require
   spring.datasource.username=<usuario>
   spring.datasource.password=<senha>
   ```
3. Empacote e rode o jar com o profile `local` (mais confiável que `mvnw spring-boot:run`, que se mostrou instável em alguns ambientes):
   ```bash
   cd backend
   ./mvnw clean package -DskipTests
   java -jar target/financeflow-backend-0.1.0.jar --spring.profiles.active=local
   ```
4. API disponível em `http://localhost:8080`. As tabelas são criadas/atualizadas automaticamente pelo Hibernate — não precisa rodar SQL manual.

## Como rodar tudo com Docker

Alternativa ao passo a passo manual acima — sobe backend e frontend com um comando só, sem precisar instalar Java, Maven ou Node.

Pré-requisito: Docker e Docker Compose instalados.

1. Copie `.env.example` pra `.env` na raiz do projeto e preencha com a connection string do banco compartilhado (Neon):
   ```bash
   cp .env.example .env
   ```
2. Suba os containers:
   ```bash
   docker compose up -d --build
   ```
   Depois de um `git pull` que trouxe mudança de código, rode esse
   mesmo comando de novo com `--build` — sem ele o Docker reaproveita
   as imagens antigas em cache e as mudanças não aparecem.
3. Acesse:
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:8080`

O `.env` nunca é commitado (já está no `.gitignore`). As tabelas continuam sendo criadas automaticamente pelo Hibernate na primeira conexão.

## Rotas da API

Todas as rotas abaixo, exceto `POST /usuarios` e `POST /login`, exigem o header `Authorization: Bearer <token>` (token JWT obtido no login, expira em 8h). Cada usuário só enxerga/edita/exclui os próprios dados — acessar registro de outro usuário retorna `404`.

### Usuário / Autenticação

| Método | Rota | Body | Resposta |
|---|---|---|---|
| POST | `/usuarios` | `{"nome", "email", "senha"}` | `201` dados do usuário (sem senha) · `409` email já cadastrado · `400` validação |
| POST | `/login` | `{"email", "senha"}` | `200` `{"token": "..."}` · `401` credenciais inválidas |

### Categoria

| Método | Rota | Body | Resposta |
|---|---|---|---|
| POST | `/categorias` | `{"nome", "tipo": "RECEITA"\|"DESPESA"}` | `201` categoria criada |
| GET | `/categorias` | — | `200` lista das categorias do usuário |
| GET | `/categorias/{id}` | — | `200` · `404` não encontrada |
| PUT | `/categorias/{id}` | `{"nome", "tipo"}` | `200` atualizada · `404` não encontrada |
| DELETE | `/categorias/{id}` | — | `204` · `404` não encontrada |

### Transação

| Método | Rota | Body | Resposta |
|---|---|---|---|
| POST | `/transacoes` | `{"categoriaId", "tipo": "RECEITA"\|"DESPESA", "valor", "descricao"?, "data": "AAAA-MM-DD"}` | `201` criada · `400` tipo incompatível com a categoria ou valor inválido · `404` categoria não encontrada |
| GET | `/transacoes` | — | `200` lista das transações do usuário |
| GET | `/transacoes/{id}` | — | `200` · `404` não encontrada |
| PUT | `/transacoes/{id}` | igual ao `POST` | `200` atualizada · `404` não encontrada |
| DELETE | `/transacoes/{id}` | — | `204` · `404` não encontrada |

Regra de negócio: o `tipo` da transação precisa ser igual ao `tipo` da categoria vinculada (RN003), e a categoria usada precisa pertencer ao mesmo usuário autenticado.

## Protótipo

Link do Figma: _adicionar aqui_

## Equipe

_adicionar nomes dos integrantes_

## Documentação

- Regras de negócio e arquitetura: `backend/CLAUDE.md`
- Proposta técnica completa: pasta compartilhada no Teams da equipe
