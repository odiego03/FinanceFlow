# FinanceFlow

Sistema de gestão financeira pessoal — Projeto Semestral da disciplina
Laboratório de Engenharia de Software (Fatec Ipiranga, ADS, 2026/2).

## Stack

- **Backend**: Java 17+, Spring Boot 3, JPA/Hibernate, Maven
- **Frontend**: React
- **Banco de dados**: MySQL
- **Infraestrutura**: Docker / Docker Compose

## Estrutura do repositório

```
financeflow/
├── backend/     # API REST em Spring Boot
├── frontend/    # Aplicação React
├── docker-compose.yml
└── README.md
```

## Como rodar o projeto

Pré-requisito: Docker e Docker Compose instalados.

```bash
docker-compose up --build
```

- Backend disponível em `http://localhost:8080`
- Frontend disponível em `http://localhost:3000`
- MySQL disponível em `localhost:3306`

## Protótipo

Link do Figma: _adicionar aqui_

## Equipe

_adicionar nomes dos integrantes_

## Documentação

- Regras de negócio e arquitetura: `backend/CLAUDE.md`
- Proposta técnica completa: pasta compartilhada no Teams da equipe
