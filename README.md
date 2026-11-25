# FinanceFlow

Sistema web de gestão financeira pessoal, gratuito e feito para jovens trabalhadores: controla receitas e despesas (inclusive parceladas), importa extrato do Nubank e do Itaú, alerta pela regra 50/30/20, acompanha metas e simula investimentos com as taxas do Banco Central.

Projeto da disciplina Laboratório de Engenharia de Software e Trabalho de Graduação (Fatec Ipiranga, Análise e Desenvolvimento de Sistemas, 2026/2).

- **Sistema publicado:** https://finance-flow-swart-psi.vercel.app (o backend gratuito "dorme" depois de 15 minutos parado; o primeiro acesso pode levar cerca de 1 minuto)
- **Versão entregue:** MVP, tag `v1.0-mvp`. Cada entrega tem uma tag: `sprint-1`, `sprint-2`, `sprint-3`, `sprint-4` e `v1.0-mvp` (a antiga `mvp` aponta para o mesmo marco, antes da carga de demonstração).
- **Vídeo de apresentação:** <LINK DO VÍDEO>
- **Protótipo (Figma):** <LINK DO FIGMA>

### Teste rápido (avaliação)

Com Docker instalado, na raiz do repositório:

```bash
git checkout v1.0-mvp
cp .env.example .env
docker compose up -d --build
```

Abra http://localhost:3000 (a primeira subida leva alguns minutos por causa do build) e entre com o usuário de teste:

| Perfil | E-mail | Senha |
|---|---|---|
| Usuário (único perfil do sistema) | `testefinanceflow@gmail.com` | `Teste1234` |

O mesmo usuário também existe no sistema publicado (https://finance-flow-swart-psi.vercel.app), com os dados de lá.

O usuário de teste já vem com três meses de histórico (agosto a outubro de 2026) e a meta "Reserva de emergência". Para refazer a importação mostrada no vídeo, use **Importar extrato > Nubank** com o arquivo [`docs/dados-demo/extrato-nubank-2026-11.csv`](docs/dados-demo/extrato-nubank-2026-11.csv). Detalhes em [Como rodar tudo com Docker](#como-rodar-tudo-com-docker).

## Stack

- **Backend**: Java 17, Spring Boot 3.3, Spring Security (JWT), JPA/Hibernate, Flyway, Maven
- **Frontend**: React 19 + Vite
- **Banco de dados**: PostgreSQL 16 (no Docker, um container com carga de demonstração; em produção e no desenvolvimento da equipe, o Neon)
- **Integrações externas**: API SGS do Banco Central (Selic, CDI, poupança, dólar, IPCA), Yahoo Finance (Ibovespa) e Brevo (e-mails)
- **Infraestrutura**: Docker + Docker Compose; testes e build no GitHub Actions; deploy no Render (backend) e na Vercel (frontend)

## Estrutura do repositório

```
FinanceFlow/
├── backend/            # API REST em Spring Boot (código, testes e migrações do Flyway)
├── frontend/           # Aplicação React (Vite)
├── docs/               # deploy.md, sprint4.md e dados-demo/ (extratos fictícios do Nubank)
├── .github/workflows/  # CI (testes do backend, lint e build do frontend)
├── docker-compose.yml  # sobe banco, backend e frontend com a carga de demonstração
├── render.yaml         # Blueprint do backend no Render
├── .env.example        # modelo das variáveis de ambiente
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
   # qualquer texto com 32+ caracteres; sem isso o backend não sobe (não há chave padrão no código)
   jwt.chave-secreta=<chave-secreta-local>
   ```
3. Empacote e rode o jar com o profile `local` (mais confiável que `mvnw spring-boot:run`, que se mostrou instável em alguns ambientes):
   ```bash
   cd backend
   ./mvnw clean package -DskipTests
   java -jar target/financeflow-backend-0.1.0.jar --spring.profiles.active=local
   ```
4. API disponível em `http://localhost:8080`. As tabelas são criadas e atualizadas pelas migrações do Flyway (`backend/src/main/resources/db/migration`, de `V1` a `V6`), que rodam sozinhas ao subir — não precisa rodar SQL manual. Mudança de esquema = um arquivo `V<n>__descricao.sql` novo; nunca editar uma migração que já rodou.

## Como rodar o frontend

```bash
cd frontend
npm install
npm run dev     # http://localhost:5173
```

O frontend chama a API no endereço da variável `VITE_API_URL` (padrão do `.env.example`: `http://localhost:8080`). Rodando com `npm run dev`, use `FRONTEND_URL=http://localhost:5173` no backend, pro botão do e-mail de confirmação abrir o endereço certo.

## Como rodar tudo com Docker

Sobe o sistema completo com um comando: banco PostgreSQL, backend e frontend, já com a carga inicial de demonstração. Não precisa instalar Java, Maven, Node nem Postgres, e não usa o banco de produção (Neon).

Pré-requisitos: Git, Docker e Docker Compose (Docker Desktop no Windows e no macOS). As portas 3000, 8080 e 5432 precisam estar livres.

1. Clone o repositório na versão entregue e crie o `.env` a partir do modelo (os valores do modelo já funcionam para testar):
   ```bash
   git clone https://github.com/odiego03/FinanceFlow.git
   cd FinanceFlow
   git checkout v1.0-mvp
   cp .env.example .env
   ```
   No Windows (PowerShell), use `copy .env.example .env`.
2. Suba os containers:
   ```bash
   docker compose up -d --build
   ```
   A primeira vez leva alguns minutos (build do backend e do frontend). Acompanhe com `docker compose ps`: quando o `financeflow-backend` aparecer como `healthy`, o frontend sobe em seguida.
3. Acesse:
   - Frontend: http://localhost:3000
   - Backend (API): http://localhost:8080 (saúde: http://localhost:8080/actuator/health)
4. Entre com o usuário de teste `testefinanceflow@gmail.com`, senha `Teste1234`.

**Carga inicial (seed):** o compose ativa o profile `demo` do backend, que roda [`CargaDemonstracao`](backend/src/main/java/com/financeflow/config/CargaDemonstracao.java) ao subir. Ela cria o usuário de teste já confirmado, as 18 categorias pré-definidas, 148 transações de agosto a outubro de 2026 (importadas pelo mesmo fluxo de importação de extrato do sistema, a partir dos CSVs em `backend/src/main/resources/demo`) e a meta "Reserva de emergência" (R$ 6.000 até 30/06/2027). Se o usuário já existe, não faz nada, então subir de novo não duplica dados. Produção e testes nunca ativam esse profile.

**Dados para a demonstração:** a pasta [`docs/dados-demo`](docs/dados-demo) tem os quatro extratos fictícios no formato do Nubank. O de novembro (`extrato-nubank-2026-11.csv`) é o importado ao vivo no vídeo: com ele, novembro fica com renda de R$ 5.000, essenciais em 52% (Atenção) e gasto total em 84% (Risco). Importar de novo um mês que já está na conta mostra a detecção de duplicatas.

**E-mails:** com `MAIL_*` e `BREVO_API_KEY` vazios (padrão do modelo), o código de "esqueci minha senha" e o link de confirmação de uma conta nova aparecem no log do backend:
```bash
docker compose logs backend
```

**Comandos úteis:**
```bash
docker compose ps                 # estado dos containers
docker compose down               # para tudo (os dados ficam no volume)
docker compose down -v            # para e apaga o banco; na próxima subida a carga roda de novo
docker compose up -d --build      # depois de um git pull, para reconstruir as imagens
```

O `.env` nunca é commitado (está no `.gitignore`). As variáveis `PG*` do `.env` só valem para rodar o backend fora do Docker; o compose sempre usa o próprio container `db`. Backend e frontend rodam sem root.

## Testes e integração contínua

O backend tem **105 testes automatizados** (JUnit 5 + Spring Boot Test): cálculos das regras de negócio (comprometimento de renda, parcelamento, investimento, relatórios, sugestões), parsers de extrato (Nubank e Itaú), sugestão de categoria, a carga de demonstração e testes de integração da API (H2 em memória, com as mesmas migrações Flyway de produção).

```bash
cd backend
./mvnw test
```

O frontend tem lint e build:

```bash
cd frontend
npm run lint
npm run build
```

O workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) roda tudo isso a cada push e a cada pull request para `main` ou `develop`. O deploy não está lá: o Render e a Vercel publicam sozinhos a cada merge na `main`.

## Deploy (produção)

Backend no Render (Docker, `render.yaml`), frontend na Vercel (`frontend/vercel.json`) e banco no Neon, todos no plano grátis; e-mails pela API do Brevo. O passo a passo, as variáveis de cada serviço e as limitações (o backend "dorme" depois de 15 minutos parado) estão em [`docs/deploy.md`](docs/deploy.md).

## Roadmap

O projeto teve 4 sprints e um MVP, com uma tag no Git por entrega.

| Entrega | Tag | Data | Foco | Status |
|---|---|---|---|---|
| Sprint#1 | `sprint-1` | 09/09/2026 | Usuário + autenticação, Categoria, Transação, Docker | ✅ concluída |
| Sprint#2 | `sprint-2` | 30/09/2026 | Metas financeiras, gráficos do Dashboard, categorias pré-definidas, indicadores de mercado | ✅ concluída |
| Sprint#3 | `sprint-3` | 21/10/2026 | Importação de extrato (Nubank), Indicador de comprometimento de renda, correções da auditoria | ✅ concluída |
| Sprint#4 | `sprint-4` | 11/11/2026 | Parcelamento, Simulação de investimento, Sugestões personalizadas, importação do Itaú, relatórios, configurações, redefinição de senha e confirmação de e-mail | ✅ concluída |
| MVP | `v1.0-mvp` | 25/11/2026 | Metas com várias categorias, edição do valor guardado nas metas, CI no GitHub Actions | ✅ concluído |

As datas são as de entrega registradas no trabalho (TG); as tags do Git foram criadas na mesma época, com alguns dias de diferença.

Módulos do sistema e onde cada um entrou:

| # | Módulo | Sprint |
|---|---|---|
| 1 | Usuário | 1 (preferências, redefinição de senha e confirmação de e-mail na 4) |
| 2 | Categoria | 1 (ícone/cor e pré-definidas na 2) |
| 3 | Transação | 1 (importação de extrato na 3) |
| 4 | Parcelamento (RN004) | 4 |
| 5 | Meta financeira (RN007) | 2 (várias categorias e edição do valor guardado no MVP) |
| 6 | Simulação de investimento (RN005) | 4 |
| 7 | Indicador de comprometimento de renda | 3 |
| 8 | Sugestões financeiras personalizadas (RN006) | 4 |
| 9 | Relatórios mensal e anual | 4 |

A numeração das regras de negócio usada no código e neste README (RN001 a RN007) é a do início do projeto. O trabalho (TG) usa uma lista final de 15 regras de negócio (RN001 a RN015), com numeração própria.

### Sprint#3: importação de extrato, indicador de comprometimento e correções

#### 3.1 Importação automática de extrato

Cadastra Transações em lote a partir do extrato do Nubank (CSV da conta
ou da fatura do cartão) ou do Itaú (OFX, ou CSV), em duas fases: **preview** (lê o arquivo e mostra o que seria
importado, sem gravar nada) e **confirmar** (só aí cria as Transações).
O arquivo nunca é salvo, nem em disco nem no banco.

- [x] Parsers dedicados por banco (`NubankExtratoParser`, `ItauExtratoParser`)
- [x] Categorização aprendida (`RegraCategorizacao`): o sistema lembra a categoria escolhida pra cada favorecido e sugere na próxima importação
- [x] Pré-preenchimento automático: sem regra aprendida, sugere a categoria por palavra-chave da descrição (iFood → Alimentação, Uber/99 → Transporte etc.). Sem palpite, a linha fica pendente
- [x] Na revisão, cada linha mostra a origem da categoria (Aprendida, Sugerida, Mesmo favorecido, Manual ou Pendente), e escolher a categoria de uma linha preenche as outras pendentes do mesmo favorecido
- [x] Integração com metas: depois de confirmar, se alguma receita importada for da categoria de uma meta, o sistema oferece destinar parte dela à meta (passo opcional, agrupado por meta, com "Completar a meta"). A importação nunca altera o progresso de uma meta sozinha
- [x] Detecção de duplicata, com a linha desmarcada por padrão na revisão
- [x] Tela de revisão linha a linha no frontend, responsiva (sem rolagem lateral), com filtros rápidos (pendentes, preenchidas, duplicadas), "Marcar todas" e o botão "Importar só as categorizadas"
- [x] Fatura do cartão do Nubank (CSV `date,title,amount`, validado com arquivo real): compra vira despesa, crédito vira receita, "Pagamento recebido" e valores zerados são ignorados
- [x] Parser do Nubank validado com extrato real: data `DD/MM/AAAA`, coluna `Identificador`, BOM UTF-8 e separador detectado automaticamente (vírgula, `;` ou tab)
- [x] Duplicata pelo `Identificador` do Nubank (único por lançamento): duas compras iguais no mesmo dia não se marcam mais como duplicadas. Transações importadas antes da coluna existir continuam detectadas por data + valor + descrição
- [x] Preview faz uma consulta só pra checar duplicatas do arquivo inteiro (antes era uma por linha)
- [x] Data ou valor inválido no CSV devolve `400` com mensagem clara (antes caía no `500`)
- [x] Confirmação atômica: se uma linha falhar, nenhuma é gravada (`@Transactional`)

#### 3.2 Indicador de comprometimento de renda (regra 50/30/20)

Mostra quanto da renda do mês já está comprometido e alerta o usuário
antes de ele se apertar. Também é a base da margem disponível do
Parcelamento e das Sugestões da Sprint#4.

- [x] Novo campo `essencial` em `Categoria`, editável na tela de Categorias (só pra despesa). Nas pré-definidas, vêm marcadas como essenciais: Moradia, Alimentação, Transporte, Saúde, Educação, Contas e Serviços, Impostos e Taxas. Categorias criadas antes do campo seguem esse padrão pelo nome, sem migração
- [x] `GET /indicadores/comprometimento?mes=AAAA-MM` (padrão: mês atual) devolve:
  - renda do mês (soma das receitas)
  - despesas essenciais e não essenciais
  - percentual essencial (essenciais ÷ renda) e percentual total (despesas ÷ renda)
  - nível: `NORMAL`, `ATENCAO` (essenciais ≥ 50% da renda) ou `RISCO` (total ≥ 80% da renda; prevalece sobre atenção)
- [x] Mês sem receita: percentuais vêm `null` e o nível vem `SEM_RENDA` (sem divisão por zero)
- [x] Card "Comprometimento" do Dashboard mostra o percentual do mês escolhido no filtro, com o nível em ícone + texto, e um alerta explicando o motivo quando o nível é `ATENCAO` ou `RISCO`

#### 3.3 Correções da auditoria

- [x] `@Transactional` nos Services que gravam mais de uma coisa (confirmação da importação; exclusão de Categoria, Transação e Meta)
- [x] Excluir uma Categoria usada por transações ou metas devolve `409` dizendo quantas são, em vez de `500`. Regras de categorização aprendidas não bloqueiam: são apagadas junto
- [x] Editar uma Transação que já tem contribuições pra metas: tipo e categoria não podem mudar (`400`)
- [x] Editar uma Meta: o `valorAlvo` não pode ficar menor que o já contribuído, e uma categoria que já gerou contribuições não pode ser removida (`400`)
- [x] As telas mostram a mensagem de erro do backend (ex: o motivo do `409`) em vez de um texto genérico
- [x] Filtro de período no Dashboard (mês ou todo o período) pros cards e pro gráfico por categoria; o gráfico por categoria ganhou o seletor Despesas/Receitas e o de evolução, o de 3/6/12 meses
- [x] Backend devolve `401` pra token ausente, inválido ou expirado (antes era `403`), e o frontend desloga e volta pro login com o aviso "Sua sessão expirou"
- [x] `GET /transacoes` com 3 consultas em vez de uma por transação (N+1)

### Sprint#4: parcelamento, simulação, sugestões e encerramento

O registro completo da sprint, pensado como matéria-prima para o texto do TCC, está em [`docs/sprint4.md`](docs/sprint4.md).

#### 4.1 Parcelamento (RN004)

- [x] Entidade `Parcelamento`: usuário, categoria (de despesa), descrição, valor total, quantidade de parcelas (2 a 60), data da primeira parcela
- [x] Ao criar, gera automaticamente uma Transação DESPESA por mês, com descrição `"<descrição> (n/N)"`. O valor é dividido igualmente e os centavos que sobram vão na última parcela (a soma sempre bate com o total)
- [x] Sugestão de parcelas: calcula a margem livre mensal (renda média − despesas médias dos 3 meses completos anteriores − parcelas já agendadas) e informa, antes do usuário confirmar, a menor quantidade de parcelas cuja parcela cabe nessa margem (mais parcelas = parcela menor)
- [x] Excluir o parcelamento apaga as parcelas futuras (as já vencidas ficam como histórico)
- [x] As parcelas aparecem na tela de Transações com o selo `n/N`. Uma parcela não pode ser editada nem excluída sozinha: a lixeira dela exclui o parcelamento

#### 4.2 Simulação de investimento (RN005)

- [x] `POST /simulacoes` com valor inicial, aporte mensal opcional (no fim de cada mês) e prazo em meses (1 a 360). Nada é gravado: a simulação é só um cálculo
- [x] Busca as taxas na API SGS do Banco Central (Selic 432, CDI 4389 e poupança 195), com cache de 1 hora. Se o BCB falhar, usa o último valor obtido; sem nenhum, o cenário vem como indisponível
- [x] Calcula o rendimento projetado em três cenários: Poupança, CDB (% do CDI informado pelo usuário, padrão 100%) e Tesouro Selic. Mostra o valor bruto e o valor líquido após o IR regressivo (22,5% → 15% conforme o tempo de cada depósito; poupança é isenta)
- [x] Simulador com inflação (IPCA, "dinheiro de hoje") e modo meta (`POST /simulacoes/aporte-necessario`: aporte mensal necessário pra chegar a um valor objetivo)
- [x] Tela "Simulador de Investimentos" no frontend: formulário, cards por cenário com o melhor destacado e gráfico da evolução mês a mês

#### 4.3 Sugestões financeiras personalizadas (RN006)

Baseadas em regras fixas (sem IA), acionadas pelo Indicador de
comprometimento e pela Simulação:

- [x] Nível `RISCO`: aponta as 3 categorias não essenciais com mais gasto no mês e quanto reduzir pra ficar abaixo de 80%
- [x] Essenciais ≥ 50% (`ATENCAO`): cortar o não essencial não resolve, então mostra quanto reduzir nas essenciais, ou quanto a renda precisaria crescer
- [x] Sobra no mês (renda − despesas > 0): sugere investir a sobra e mostra quanto ela renderia em 12 meses no melhor cenário da Simulação
- [x] Meta com data-alvo: calcula quanto falta contribuir por mês pra bater no prazo e avisa se a meta está vencida ou atrasada (abaixo do ritmo linear entre a criação e a data-alvo)
- [x] Parcelamento acima da margem livre: alerta, listando os parcelamentos em andamento
- [x] `GET /sugestoes?mes=AAAA-MM` e painel "Sugestões para você" no Dashboard, que segue o filtro de período

#### 4.4 Importação do Itaú

O parser (`ItauExtratoParser`) lê **OFX** (recomendado: o "Salvar em OFX" do internet banking) e CSV. O extrato `.xls` do Itaú não é lido: o sistema recusa e pede o OFX. Os dois layouts foram escritos a partir do padrão do OFX e de um print do extrato, ainda sem um arquivo real exportado.

- [x] Leitura de OFX (SGML e XML, charset 1252 ou UTF-8) e linhas de saldo ignoradas no CSV
- [x] Testes do parser com OFX e CSV fictícios no layout do print
- [ ] Validar com um OFX real exportado do Itaú e ajustar o parser se preciso
- [ ] Conferir se as chaves da categorização aprendida e as palavras-chave funcionam com as descrições do Itaú (ex: "PIX TRANSF FULANO 12/09")

#### 4.5 Encerramento

- [x] Testes automatizados: cálculos das regras, parsers, sugestão de categoria e testes de integração da API (ver "Testes e integração contínua")
- [x] Correções da auditoria final: timeout nas APIs externas, categoria em uso não muda de tipo, limites de tamanho/valor (400 em vez de 500), email sem diferenciar maiúsculas, bloqueio após 5 logins errados, segredo JWT obrigatório, Flyway com índices, consultas por período, contribuição com trava, Docker sem root e com healthcheck
- [x] Redesenho de Dashboard, Transações (paginação, lista por dia) e modais; cabeçalho e marca novos; esqueletos de carregamento; Configurações em abas; tutorial de primeiro acesso

#### Outras entregas da Sprint#4

- [x] **Redefinição de senha em 3 etapas** (e-mail, só o código, "Nova senha"), com "Reenviar código" bloqueado por 1 minuto, com contagem regressiva
- [x] **Troca de senha só com código do e-mail:** a troca digitando a senha atual foi removida; em Configurações, "Trocar senha" envia o código e abre o mesmo fluxo
- [x] **Confirmação de conta por e-mail:** o cadastro envia um e-mail com o botão "Confirmar conta" (link de 24 h, uso único) e o login dá `403` até a conta ser confirmada. Migração `V5`; contas que já existiam ficam confirmadas. Precisa da variável `FRONTEND_URL`
- [x] **Mostrar/ocultar senha** (olho) no login, cadastro e redefinição
- [x] **Importação:** extrato do Itaú em OFX e CSV da fatura do cartão do Nubank
- [x] **Responsividade no celular:** grades sem rolagem lateral, menu lateral que nasce fechado, rodapé de indicadores visível (`dvh`) e botões com área de toque maior
- [x] **Simulador** abre com os campos em branco (só placeholders)
- [x] Tela de Configurações (antes "Meu Perfil"), em abas: perfil e senha, aparência e privacidade, alertas e simulador, dados (exportar CSV, restaurar categorias padrão, excluir por período) e ajuda
- [x] Tutorial de primeiro acesso, guardado na conta e reaberto em Configurações → Ajuda
- [x] Preferências salvas na conta: ocultar valores em R$ (também pelo olho da barra superior), limites próprios do alerta de comprometimento (o Indicador e as Sugestões passam a usá-los) e padrões do Simulador
- [x] Excluir transações por período, na "Zona de perigo" de Configurações → Dados: prévia do que sai (quantidade, totais, contribuições a metas) e confirmação digitando EXCLUIR. Parcelas ficam de fora
- [x] Tema escuro: Claro, Escuro ou Automático (segue o sistema), salvo nas preferências da conta
- [x] Relatórios mensal e anual: resumo com taxa de poupança, comparação com o período anterior, despesas e receitas por categoria, maiores despesas, mês a mês (anual), exportação CSV e impressão/PDF
- [x] Filtros na lista de Transações: período (presets ou datas personalizadas), categoria, tipo, faixa de valor, busca e ordenação, com resumo dos totais filtrados, e paginação

### MVP

- [x] **Meta com várias categorias de receita** (migração `V6`): uma meta pode ser alimentada por receitas de mais de uma categoria
- [x] **Edição do valor guardado nas metas:** ver, alterar ou remover cada contribuição de uma meta, com o modal deixando explícito quanto manter na meta
- [x] **GitHub Actions:** testes do backend e lint + build do frontend a cada push e pull request
- [x] **Docker completo para avaliação:** banco PostgreSQL no compose e carga inicial com usuário de teste (profile `demo`)
- [x] Tudo integrado na `main` e marcado com a tag `v1.0-mvp`
- [ ] Validar o parser do Itaú com um OFX real (ver 4.4)

## Rotas da API

Todas as rotas abaixo, exceto `POST /usuarios`, `POST /usuarios/confirmar-email`, `POST /usuarios/reenviar-confirmacao`, `POST /login`, `POST /senha/esqueci`, `POST /senha/verificar` e `POST /senha/redefinir`, exigem o header `Authorization: Bearer <token>` (token JWT obtido no login, expira em 8h); sem token, ou com token inválido ou expirado, a resposta é `401`. Cada usuário só enxerga/edita/exclui os próprios dados — acessar registro de outro usuário retorna `404`.

### Usuário / Autenticação

| Método | Rota | Body | Resposta |
|---|---|---|---|
| POST | `/usuarios` | `{"nome", "email", "senha"}` | `201` dados do usuário (sem senha); a conta nasce **não confirmada** e um e-mail com o botão "Confirmar conta" é enviado · `409` email já cadastrado · `400` validação (email `nome@dominio.com`; senha com mín. 6 caracteres, 1 maiúscula e 1 número) |
| POST | `/usuarios/confirmar-email` | `{"token"}` | `204` confirma a conta (o token vem no link do e-mail) · `400` link inválido, expirado (24 h) ou já usado |
| POST | `/usuarios/reenviar-confirmacao` | `{"email"}` | `204` sempre (não revela se a conta existe nem se já foi confirmada); se existir e não estiver confirmada, manda outro e-mail (um por minuto; o link anterior deixa de valer) |
| POST | `/login` | `{"email", "senha"}` | `200` `{"token": "..."}` · `401` credenciais inválidas · `403` senha certa mas e-mail ainda não confirmado · cinco senhas erradas seguidas bloqueiam o login por 15 minutos |
| POST | `/senha/esqueci` | `{"email"}` | `204` sempre (não revela se a conta existe); se existir, manda por e-mail um código de 6 números válido por 15 min (um pedido por minuto) |
| POST | `/senha/verificar` | `{"email", "codigo"}` | `204` se o código confere (só confere: não troca a senha nem gasta o código) · `400` código inválido, expirado ou com 5 tentativas erradas (código errado gasta uma tentativa) |
| POST | `/senha/redefinir` | `{"email", "codigo", "novaSenha"}` | `204` · `400` código inválido, expirado, já usado ou com 5 tentativas erradas, ou senha fraca |
| GET | `/usuarios/me` | — | `200` dados do usuário autenticado |
| PUT | `/usuarios/me` | `{"nome"}` | `200` usuário atualizado (o e-mail não muda) · `400` validação |
| GET | `/usuarios/me/preferencias` | — | `200` `{"ocultarValores", "limiteEssencial", "limiteTotal", "simuladorPercentualCdi", "simuladorPrazoMeses", "tema", "tutorialConcluido"}` (padrões se nunca salvou) |
| PUT | `/usuarios/me/preferencias` | igual à resposta do `GET` | `200` preferências salvas · `400` fora das faixas ou limite essencial ≥ limite total |
| PUT | `/usuarios/me/preferencias/tutorial` | `{"concluido": true\|false}` | `200` preferências com o tutorial de primeiro acesso marcado (ou reaberto) |

As preferências incluem `tema`: `CLARO` (padrão), `ESCURO` ou `SISTEMA`.

### Categoria

| Método | Rota | Body | Resposta |
|---|---|---|---|
| POST | `/categorias` | `{"nome", "tipo": "RECEITA"\|"DESPESA", "icone"?, "cor"?, "essencial"?}` | `201` categoria criada |
| GET | `/categorias` | — | `200` lista das categorias do usuário |
| GET | `/categorias/{id}` | — | `200` · `404` não encontrada |
| PUT | `/categorias/{id}` | igual ao `POST` | `200` atualizada · `404` não encontrada |
| DELETE | `/categorias/{id}` | — | `204` · `404` não encontrada · `409` em uso por transações ou metas |
| GET | `/categorias/predefinidas` | — | `200` catálogo de categorias pré-definidas |
| POST | `/categorias/predefinidas` | — | `200` adiciona ao usuário as pré-definidas que ele ainda não tem |

`icone` é o nome de uma classe do Bootstrap Icons sem o prefixo `bi-` (ex: `cup-hot-fill`); `cor` é um hex (ex: `#f97316`).

### Transação

| Método | Rota | Body | Resposta |
|---|---|---|---|
| POST | `/transacoes` | `{"categoriaId", "tipo": "RECEITA"\|"DESPESA", "valor", "descricao"?, "data": "AAAA-MM-DD"}` | `201` criada · `400` tipo incompatível com a categoria ou valor inválido · `404` categoria não encontrada |
| GET | `/transacoes` | — | `200` lista das transações do usuário |
| GET | `/transacoes/{id}` | — | `200` · `404` não encontrada |
| PUT | `/transacoes/{id}` | igual ao `POST` | `200` atualizada · `400` valor menor que o já contribuído pra metas, troca de tipo/categoria numa transação com contribuições, ou a transação é uma parcela · `404` não encontrada |
| DELETE | `/transacoes/{id}` | — | `204` (apaga junto as contribuições pra metas) · `400` a transação é uma parcela (exclua o parcelamento) · `404` não encontrada |
| GET | `/transacoes/evolucao-mensal?meses=6` | — | `200` receitas/despesas dos últimos N meses (padrão 6, máx. 24) |
| GET | `/transacoes/por-categoria?tipo=DESPESA&mes=AAAA-MM` | — | `200` total por categoria (com cor), do maior pro menor; sem `mes` = todo o período · `400` parâmetro inválido |
| GET | `/transacoes/exclusao-em-massa/previa?dataInicio=&dataFim=` | — | `200` `{"quantidade", "totalReceitas", "totalDespesas", "contribuicoesMetas", "valorContribuidoMetas", "parcelasMantidas"}` do que seria apagado · `400` início depois do fim |
| DELETE | `/transacoes/exclusao-em-massa?dataInicio=&dataFim=` | — | `200` mesmo formato, com o que foi apagado (datas vazias = sem limite; parcelas nunca entram) |
| POST | `/transacoes/importar/preview` | multipart: `arquivo` (CSV do Nubank, OFX ou CSV do Itaú) + `banco` = `NUBANK`\|`ITAU` | `200` linhas que seriam importadas, com categoria sugerida e flag de duplicada (não grava nada) · `400` arquivo inválido |
| POST | `/transacoes/importar/confirmar` | `{"linhas": [{"data", "descricao", "valor", "tipo", "categoriaId", "identificador"?}]}` | `200` `{"transacoesCriadas", "transacoes"}` · `400` validação ou tipo incompatível |

Regra de negócio: o `tipo` da transação precisa ser igual ao `tipo` da categoria vinculada (RN003), e a categoria usada precisa pertencer ao mesmo usuário autenticado.

### Meta financeira

| Método | Rota | Body | Resposta |
|---|---|---|---|
| POST | `/metas` | `{"nome", "valorAlvo", "categoriaIds": [..], "dataAlvo"?}` | `201` criada · `400` lista de categorias vazia ou categoria que não é de RECEITA |
| GET | `/metas` | — | `200` lista das metas, com o progresso calculado |
| GET | `/metas/{id}` | — | `200` · `404` não encontrada |
| PUT | `/metas/{id}` | igual ao `POST` | `200` atualizada · `400` `valorAlvo` menor que o já contribuído, ou remoção de uma categoria que já gerou contribuições (adicionar categorias é livre) · `404` não encontrada |
| DELETE | `/metas/{id}` | — | `204` (apaga junto as contribuições) · `404` não encontrada |
| POST | `/metas/{id}/contribuicoes` | `{"transacaoId", "valor"}` | `201` contribuição registrada · `400` passa do saldo da transação ou do que falta pra meta |
| GET | `/metas/{id}/contribuicoes` | — | `200` contribuições da meta, com a receita de origem e o `maximo` que cada uma pode ter agora |
| PUT | `/metas/{id}/contribuicoes/{contribuicaoId}` | `{"valor"}` | `200` contribuição com o novo valor · `400` passa do saldo da transação ou do que falta pra meta |
| DELETE | `/metas/{id}/contribuicoes/{contribuicaoId}` | — | `204` remove a contribuição (o valor volta pro saldo da receita) |
| GET | `/metas/contribuicoes?transacaoId=` | — | `200` contribuições que uma receita já fez a metas |

Regra de negócio (RN007): o progresso da meta é a soma das contribuições, e cada contribuição vem de uma receita de uma das categorias da meta, limitada ao saldo ainda não destinado daquela transação.

### Parcelamento

| Método | Rota | Body | Resposta |
|---|---|---|---|
| POST | `/parcelamentos` | `{"categoriaId", "descricao", "valorTotal", "quantidadeParcelas", "dataPrimeiraParcela": "AAAA-MM-DD"}` | `201` parcelamento criado (as parcelas viram Transações) · `400` categoria não é de despesa ou validação · `404` categoria não encontrada |
| GET | `/parcelamentos` | — | `200` lista dos parcelamentos, com valor da parcela e quantas já venceram |
| GET | `/parcelamentos/{id}` | — | `200` · `404` não encontrado |
| DELETE | `/parcelamentos/{id}` | — | `204` apaga as parcelas futuras; as vencidas ficam como transações comuns · `404` não encontrado |
| GET | `/parcelamentos/sugestao?valorTotal=&dataPrimeiraParcela=` | — | `200` `{"rendaMedia", "despesasMedia", "parcelasComprometidas", "margemLivre", "quantidadeMinimaParcelas"}`; os dois últimos vêm `null` sem receita nos últimos 3 meses |

Regra de negócio (RN004): o valor é dividido igualmente entre as parcelas (centavos que sobram na última), e a sugestão é a menor quantidade de parcelas cuja parcela cabe na margem livre mensal do usuário.

### Simulação de investimento

| Método | Rota | Body | Resposta |
|---|---|---|---|
| POST | `/simulacoes` | `{"valorInicial", "aporteMensal"?, "prazoMeses", "percentualCdi"?}` | `200` taxas usadas, total investido, os 3 cenários (bruto, IR, líquido, e valor em dinheiro de hoje), `melhorCenario` e a evolução mês a mês · `400` validação, ou valor inicial e aporte zerados |
| POST | `/simulacoes/aporte-necessario` | `{"valorObjetivo", "valorInicial"?, "prazoMeses", "percentualCdi"?}` | `200` aporte mensal necessário em cada cenário pra chegar ao valor objetivo (líquido de IR) · `400` validação |
| GET | `/simulacoes/taxas` | — | `200` `{"selic", "cdi", "poupancaMensal", "atualizadoEm"}` (Selic e CDI em % a.a., poupança em % a.m.) |

Regra de negócio (RN005): juros compostos mês a mês com as taxas atuais do Banco Central; CDB e Tesouro Selic pagam IR regressivo sobre o rendimento de cada depósito, a poupança é isenta.

### Relatórios

| Método | Rota | Body | Resposta |
|---|---|---|---|
| GET | `/relatorios?tipo=MENSAL&referencia=AAAA-MM` ou `?tipo=ANUAL&referencia=AAAA` | — | `200` resumo do período e do anterior (receitas, despesas, saldo, taxa de poupança), totais por categoria com variação, 5 maiores despesas e, no anual, a evolução mês a mês · `400` referência inválida |

### Sugestões

| Método | Rota | Body | Resposta |
|---|---|---|---|
| GET | `/sugestoes?mes=AAAA-MM` | — | `200` lista de `{"tipo", "severidade", "titulo", "mensagem", "valor", "itens"}`, ordenada por severidade (`ALERTA`, `ATENCAO`, `DICA`); sem `mes` = mês atual |

Regra de negócio (RN006): sugestões por regras fixas (sem IA), acionadas pelo Indicador de comprometimento, pela Simulação, pelas Metas com data-alvo e pela margem livre do Parcelamento.

### Indicadores

| Método | Rota | Body | Resposta |
|---|---|---|---|
| GET | `/indicadores/mercado` | — | `200` `{"selic", "dolar", "ibovespa", "atualizadoEm"}`; um campo vem `null` se a API externa dele falhar |
| GET | `/indicadores/comprometimento?mes=AAAA-MM` | — | `200` renda, despesas essenciais/não essenciais, percentuais, `nivel` (`NORMAL`, `ATENCAO`, `RISCO` ou `SEM_RENDA`) e os limites usados (`limiteEssencial`, `limiteTotal`, das preferências do usuário) do mês (padrão: mês atual) |

## Protótipo

Link do Figma: <LINK DO FIGMA>

## Equipe

Equipe 02 (turno: <TURNO>):

| Nome | RA |
|---|---|
| Cauê Ferreira Lacerda | 2040482412015 |
| Diego Silva de Oliveira | 2040482412012 |
| Matheus Arthur Moreira da Silva | 2040482412022 |
| Paulo Ricardo Ferreira Brito | 2040482412044 |

Professor de Laboratório de Engenharia de Software: Prof. Carlos Veríssimo.

Orientador: Prof. Me. Rodrigo Bossini Tavares Moreira (Fatec Ipiranga).

## Documentação

- Regras de negócio e arquitetura do backend: `backend/CLAUDE.md` (e `frontend/CLAUDE.md` para o frontend)
- Deploy: [`docs/deploy.md`](docs/deploy.md)
- Registro da Sprint#4: [`docs/sprint4.md`](docs/sprint4.md)
- Proposta técnica completa: pasta compartilhada no Teams da equipe
