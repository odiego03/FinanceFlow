# Finance Flow

## 1. Sobre o sistema

**Finance Flow** é um sistema web de gestão financeira pessoal, gratuito e feito para **jovens trabalhadores** que têm dificuldade em controlar o próprio dinheiro.

**Problema que resolve:** segundo a pesquisa Observatório Febraban (IPESPE, junho de 2025), 55% dos brasileiros dizem entender pouco ou nada de educação financeira e 39% estão endividados. Quem começa a trabalhar costuma não saber para onde vai o salário nem quanto pode gastar sem se apertar.

**O que o sistema faz:**

- registra receitas e despesas por categoria, inclusive compras parceladas;
- importa o extrato do Nubank e do Itaú, com prévia, sugestão de categoria e detecção de duplicatas;
- mostra no Dashboard quanto da renda está comprometido e alerta pela regra 50/30/20 (Atenção quando as despesas essenciais chegam a 50% da renda, Risco quando o gasto total chega a 80%);
- dá sugestões personalizadas: onde cortar, quanto investir da sobra, ritmo das metas;
- acompanha metas financeiras alimentadas pelas receitas;
- simula investimentos (Poupança, CDB e Tesouro Selic) com as taxas atuais do Banco Central, imposto de renda e inflação;
- gera relatórios mensais e anuais, exportáveis em CSV e PDF.

Projeto de Laboratório de Engenharia de Software e Trabalho de Graduação — Fatec Ipiranga, Análise e Desenvolvimento de Sistemas, 2026/2. Versão entregue: tag **`v1.0-mvp`**.

## 2. Integrantes

**Equipe 02 — Turno: Vespertino**

| Nome completo | RA |
|---|---|
| Cauê Ferreira Lacerda | 2040482412015 |
| Diego Silva de Oliveira | 2040482412012 |
| Matheus Arthur Moreira da Silva | 2040482412022 |
| Paulo Ricardo Ferreira Brito | 2040482412044 |

Professor de Laboratório de Engenharia de Software: Prof. Carlos Veríssimo. 
Orientador do TG: Prof. Me. Rodrigo Bossini Tavares Moreira.

## 3. Tecnologias e versões

| Camada | Tecnologia | Versão |
|---|---|---|
| Linguagem (backend) | Java | 17 |
| Framework (backend) | Spring Boot | 3.3.4 |
| Autenticação | JWT + senhas com BCrypt | 0.12.6 |
| Migrações do banco | Flyway | gerenciada pelo Spring Boot 3.3.4 |
| Leitura de extratos | Apache Commons CSV | 1.11.0 |
| Build (backend) | Maven | 3.9.9 |
| Linguagem (frontend) | JavaScript, Node.js | Node 20 |
| Framework (frontend) | React | 19.2 |
| Build (frontend) | Vite | 8.2 |
| Rotas e gráficos | React Router / Recharts | 7.18 / 3.10 |
| Banco de dados | PostgreSQL | 16 (Docker); Neon em produção |
| Testes | JUnit 5, Spring Boot Test, H2 | os do Spring Boot 3.3.4 |
| Contêineres | Docker e Docker Compose | Compose v2 |
| Integrações | API SGS do Banco Central, Yahoo Finance, Brevo (e-mails) | — |
| Integração contínua e deploy | GitHub Actions; Render (backend) e Vercel (frontend) | — |

## 4. Pré-requisitos e execução

### Pré-requisitos

- [Git](https://git-scm.com/)
- [Docker](https://docs.docker.com/get-docker/) com Docker Compose
- Portas **3000**, **8080** e **5432** livres

Não é preciso instalar Java, Maven, Node nem PostgreSQL: tudo roda nos containers.

### Passo a passo

1. Clone o repositório na versão entregue:

   ```bash
   git clone https://github.com/odiego03/FinanceFlow.git
   cd FinanceFlow
   git checkout v1.0-mvp
   ```

2. Crie o arquivo de variáveis a partir do modelo (os valores do modelo já funcionam para testar):

   ```bash
   cp .env.example .env
   ```

   No Windows (PowerShell):

   ```powershell
   copy .env.example .env
   ```

3. Suba banco, backend e frontend:

   ```bash
   docker compose up -d --build
   ```

   A primeira subida leva alguns minutos (build das imagens). Para acompanhar:

   ```bash
   docker compose ps
   ```

   Quando o `financeflow-backend` aparecer como `healthy`, o frontend sobe em seguida.

4. Acesse:

   - Sistema: http://localhost:3000
   - API: http://localhost:8080 (saúde: http://localhost:8080/actuator/health)

5. Entre com o usuário de teste (item 5).

**Carga inicial:** ao subir, o backend cria o usuário de teste já confirmado, as 18 categorias pré-definidas, 148 transações de agosto a outubro de 2026 e a meta "Reserva de emergência". Para refazer a importação mostrada no vídeo, use **Transações > Importar extrato > Nubank** com o arquivo [`docs/dados-demo/extrato-nubank-2026-11.csv`](docs/dados-demo/extrato-nubank-2026-11.csv).

**E-mails:** sem SMTP configurado (padrão do `.env.example`), o código de "esqueci minha senha" e o link de confirmação de uma conta nova aparecem no log:

```bash
docker compose logs backend
```

**Outros comandos:**

```bash
docker compose down        # para os containers (os dados ficam guardados)
docker compose down -v     # para e apaga o banco; na próxima subida a carga inicial roda de novo
```

O `.env` nunca é commitado. As variáveis `PG*` do `.env` só valem para rodar o backend fora do Docker; o compose sempre usa o próprio banco. Para rodar backend e frontend sem Docker, veja [`docs/desenvolvimento.md`](docs/desenvolvimento.md).

## 5. Usuários e senhas de teste

O sistema tem **um único perfil**: cada usuário acessa somente os próprios dados (sem login, as telas voltam para o login; o registro de outro usuário responde `404`).

| Perfil | E-mail | Senha | Onde |
|---|---|---|---|
| Usuário | `testefinanceflow@gmail.com` | `Teste1234` | Docker e sistema publicado |

Também é possível criar uma conta nova pela tela de login (no Docker, o link de confirmação aparece em `docker compose logs backend`).

## 6. Como executar os testes

**Backend** — 105 testes automatizados (JUnit 5 + Spring Boot Test): regras de negócio, leitores de extrato, sugestão de categoria, carga inicial e testes de integração da API, com banco H2 em memória e as mesmas migrações do Flyway. Precisa do Java 17.

```bash
cd backend
./mvnw test
```

No Windows (PowerShell):

```powershell
cd backend
.\mvnw.cmd test
```

**Frontend** — lint e build (precisa do Node 20):

```bash
cd frontend
npm install
npm run lint
npm run build
```

**Integração contínua:** o workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) roda os testes do backend e o lint e o build do frontend a cada push e pull request para `main` e `develop`.

**Testes manuais:** o Plano de Testes (136 casos, nas quatro sprints e no MVP) está na Documentação Final (Apêndice A).

## 7. Links

- **Vídeo de apresentação:** https://youtu.be/EAbOBorUA9U
- **Protótipo no Figma:** https://www.figma.com/make/VaBWsU1rsVNneQdy7HlhPV/Plataforma-de-Gest%C3%A3o-Financeira?t=Rh7VDwwbwBXwu7rw-1
- **Sistema publicado:** https://finance-flow-swart-psi.vercel.app — o backend gratuito hiberna depois de 15 minutos parado; o primeiro acesso pode levar cerca de 1 minuto.

## Mais informações

| Assunto | Onde |
|---|---|
| Estrutura do repositório | `backend/` (API Spring Boot, testes e migrações), `frontend/` (React), `docs/`, `docker-compose.yml`, `render.yaml`, `.env.example` |
| Rodar sem Docker | [`docs/desenvolvimento.md`](docs/desenvolvimento.md) |
| Rotas da API | [`docs/api.md`](docs/api.md) |
| Sprints e funcionalidades entregues | [`docs/roadmap.md`](docs/roadmap.md) |
| Deploy em produção | [`docs/deploy.md`](docs/deploy.md) |
| Registro da Sprint#4 | [`docs/sprint4.md`](docs/sprint4.md) |
| Regras de negócio e arquitetura | `backend/CLAUDE.md` e `frontend/CLAUDE.md` |
