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

## Roadmap

O projeto tem 4 sprints. A Sprint#4 é a última e fecha todos os módulos
previstos na proposta, mais as pendências técnicas.

| Sprint | Foco | Status |
|---|---|---|
| Sprint#1 | Usuário + autenticação, Categoria, Transação, Docker | ✅ concluída |
| Sprint#2 | Metas financeiras, gráficos do Dashboard, categorias pré-definidas, indicadores de mercado | ✅ concluída |
| Sprint#3 | Importação de extrato (Nubank), Indicador de comprometimento de renda, correções da auditoria | ✅ concluída (falta mergear os PRs) |
| Sprint#4 | Parcelamento, Simulação de investimento, Sugestões personalizadas, importação do Itaú, encerramento | ⏳ planejada |

Módulos do sistema e onde cada um entra:

| # | Módulo | Sprint |
|---|---|---|
| 1 | Usuário | 1 |
| 2 | Categoria | 1 (ícone/cor e pré-definidas na 2) |
| 3 | Transação | 1 (importação de extrato na 3) |
| 4 | Parcelamento (RN004) | 4 |
| 5 | Meta financeira (RN007) | 2 |
| 6 | Simulação de investimento (RN005) | 4 |
| 7 | Indicador de comprometimento de renda | 3 |
| 8 | Sugestões financeiras personalizadas (RN006) | 4 |

### Sprint#3: importação de extrato, indicador de comprometimento e correções

#### 3.1 Importação automática de extrato

Cadastra Transações em lote a partir do CSV exportado do Nubank ou do
Itaú, em duas fases: **preview** (lê o arquivo e mostra o que seria
importado, sem gravar nada) e **confirmar** (só aí cria as Transações).
O arquivo nunca é salvo, nem em disco nem no banco.

- [x] Parsers dedicados por banco (`NubankExtratoParser`, `ItauExtratoParser`)
- [x] Categorização aprendida (`RegraCategorizacao`): o sistema lembra a categoria escolhida pra cada favorecido e sugere na próxima importação
- [x] Pré-preenchimento automático: sem regra aprendida, sugere a categoria por palavra-chave da descrição (iFood → Alimentação, Uber/99 → Transporte etc.). Sem palpite, a linha fica pendente
- [x] Na revisão, cada linha mostra a origem da categoria (Aprendida, Sugerida, Mesmo favorecido, Manual ou Pendente), e escolher a categoria de uma linha preenche as outras pendentes do mesmo favorecido
- [x] Integração com metas: depois de confirmar, se alguma receita importada for da categoria de uma meta, o sistema oferece destinar parte dela à meta (passo opcional, agrupado por meta, com "Completar a meta"). A importação nunca altera o progresso de uma meta sozinha
- [x] Detecção de duplicata, com a linha desmarcada por padrão na revisão
- [x] Tela de revisão linha a linha no frontend
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
- [x] Editar uma Meta: o `valorAlvo` não pode ficar menor que o já contribuído, e a categoria não muda se já houver contribuições (`400`)
- [x] As telas mostram a mensagem de erro do backend (ex: o motivo do `409`) em vez de um texto genérico
- [x] Filtro de período no Dashboard (mês ou todo o período) pros cards e pro gráfico por categoria; o gráfico por categoria ganhou o seletor Despesas/Receitas e o de evolução, o de 3/6/12 meses
- [x] Backend devolve `401` pra token ausente, inválido ou expirado (antes era `403`), e o frontend desloga e volta pro login com o aviso "Sua sessão expirou"
- [x] `GET /transacoes` com 3 consultas em vez de uma por transação (N+1)
- [ ] Mergear os PRs da Sprint#3 na `develop` e a `develop` na `main` (a `main` ainda está com o revert do fix do Ibovespa), e apagar as branches já mergeadas

### Sprint#4 (final): parcelamento, simulação, sugestões e encerramento

#### 4.1 Parcelamento (RN004)

- [ ] Entidade `Parcelamento`: usuário, categoria, descrição, valor total, quantidade de parcelas, data da primeira parcela
- [ ] Ao criar, gera automaticamente uma Transação DESPESA por mês, com descrição `"<descrição> (n/N)"`. O valor é dividido igualmente e os centavos que sobram vão na última parcela (a soma sempre bate com o total)
- [ ] Sugestão de parcelas: calcula a margem livre mensal (renda média − despesas médias dos últimos 3 meses, usando o Indicador da Sprint#3) e informa a quantidade máxima de parcelas recomendada antes do usuário confirmar
- [ ] Excluir o parcelamento apaga as parcelas futuras (as já vencidas ficam como histórico)
- [ ] As parcelas aparecem na tela de Transações identificadas como parcela

#### 4.2 Simulação de investimento (RN005)

- [ ] `POST /simulacoes` com valor inicial, aporte mensal opcional e prazo em meses
- [ ] Busca as taxas na API SGS do Banco Central (Selic, CDI e poupança), com o mesmo esquema de cache e fallback do rodapé de indicadores
- [ ] Calcula o rendimento projetado em três cenários: Poupança, CDB (% do CDI informado pelo usuário, padrão 100%) e Tesouro Selic. Mostra o valor bruto e o valor líquido após o IR regressivo (22,5% → 15% conforme o prazo; poupança é isenta)
- [ ] Tela de Simulação no frontend: formulário, cards por cenário e gráfico da evolução mês a mês

#### 4.3 Sugestões financeiras personalizadas (RN006)

Baseadas em regras fixas (sem IA), acionadas pelo Indicador de
comprometimento e pela Simulação:

- [ ] Nível `RISCO` ou `ATENCAO`: aponta as categorias não essenciais com mais gasto no mês e quanto reduzir pra voltar ao nível `NORMAL`
- [ ] Sobra no mês (renda − despesas > 0): sugere investir a sobra e mostra quanto ela renderia no melhor cenário da Simulação
- [ ] Meta com data-alvo: calcula quanto falta contribuir por mês pra bater no prazo e avisa se a meta estiver atrasada
- [ ] Parcelamento acima da margem livre: alerta
- [ ] `GET /sugestoes` e painel de sugestões no Dashboard

#### 4.4 Importação do Itaú

O parser (`ItauExtratoParser`) já existe, mas foi escrito com base no layout mais comum conhecido, sem um arquivo real.

- [ ] Validar com um CSV real exportado do Itaú e ajustar o parser (provável encoding ISO-8859-1 e nomes de coluna)
- [ ] Teste automatizado do parser com um arquivo no layout real, com dados fictícios
- [ ] Conferir se as chaves da categorização aprendida e as palavras-chave funcionam com as descrições do Itaú (ex: "PIX TRANSF FULANO 12/09")

#### 4.5 Encerramento

- [x] Primeiros testes automatizados (parsers, sugestão de categoria, indicador de comprometimento)
- [ ] Testes automatizados dos Services com as regras de negócio (RN001–RN007, importação, indicador, parcelamento)
- [ ] Perfil do usuário: editar nome e trocar senha
- [x] Filtros na lista de Transações: período (presets ou datas personalizadas), categoria, tipo, faixa de valor, busca e ordenação, com resumo dos totais filtrados
- [ ] Paginação na lista de Transações
- [ ] README final: rotas completas, link do Figma, integrantes da equipe
- [ ] Versão final mergeada na `main` e marcada com a tag `v1.0`

## Rotas da API

Todas as rotas abaixo, exceto `POST /usuarios` e `POST /login`, exigem o header `Authorization: Bearer <token>` (token JWT obtido no login, expira em 8h); sem token, ou com token inválido ou expirado, a resposta é `401`. Cada usuário só enxerga/edita/exclui os próprios dados — acessar registro de outro usuário retorna `404`.

### Usuário / Autenticação

| Método | Rota | Body | Resposta |
|---|---|---|---|
| POST | `/usuarios` | `{"nome", "email", "senha"}` | `201` dados do usuário (sem senha) · `409` email já cadastrado · `400` validação |
| POST | `/login` | `{"email", "senha"}` | `200` `{"token": "..."}` · `401` credenciais inválidas |
| GET | `/usuarios/me` | — | `200` dados do usuário autenticado |

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
| PUT | `/transacoes/{id}` | igual ao `POST` | `200` atualizada · `400` valor menor que o já contribuído pra metas, ou troca de tipo/categoria numa transação com contribuições · `404` não encontrada |
| DELETE | `/transacoes/{id}` | — | `204` (apaga junto as contribuições pra metas) · `404` não encontrada |
| GET | `/transacoes/evolucao-mensal?meses=6` | — | `200` receitas/despesas dos últimos N meses (padrão 6, máx. 24) |
| GET | `/transacoes/por-categoria?tipo=DESPESA&mes=AAAA-MM` | — | `200` total por categoria (com cor), do maior pro menor; sem `mes` = todo o período · `400` parâmetro inválido |
| POST | `/transacoes/importar/preview` | multipart: `arquivo` (CSV) + `banco` = `NUBANK`\|`ITAU` | `200` linhas que seriam importadas, com categoria sugerida e flag de duplicada (não grava nada) · `400` arquivo inválido |
| POST | `/transacoes/importar/confirmar` | `{"linhas": [{"data", "descricao", "valor", "tipo", "categoriaId", "identificador"?}]}` | `200` `{"transacoesCriadas", "transacoes"}` · `400` validação ou tipo incompatível |

Regra de negócio: o `tipo` da transação precisa ser igual ao `tipo` da categoria vinculada (RN003), e a categoria usada precisa pertencer ao mesmo usuário autenticado.

### Meta financeira

| Método | Rota | Body | Resposta |
|---|---|---|---|
| POST | `/metas` | `{"nome", "valorAlvo", "categoriaId", "dataAlvo"?}` | `201` criada · `400` categoria não é de RECEITA |
| GET | `/metas` | — | `200` lista das metas, com o progresso calculado |
| GET | `/metas/{id}` | — | `200` · `404` não encontrada |
| PUT | `/metas/{id}` | igual ao `POST` | `200` atualizada · `400` `valorAlvo` menor que o já contribuído, ou troca de categoria com contribuições · `404` não encontrada |
| DELETE | `/metas/{id}` | — | `204` (apaga junto as contribuições) · `404` não encontrada |
| POST | `/metas/{id}/contribuicoes` | `{"transacaoId", "valor"}` | `201` contribuição registrada · `400` passa do saldo da transação ou do que falta pra meta |

Regra de negócio (RN007): o progresso da meta é a soma das contribuições, e cada contribuição vem de uma receita da mesma categoria da meta, limitada ao saldo ainda não destinado daquela transação.

### Indicadores

| Método | Rota | Body | Resposta |
|---|---|---|---|
| GET | `/indicadores/mercado` | — | `200` `{"selic", "dolar", "ibovespa", "atualizadoEm"}`; um campo vem `null` se a API externa dele falhar |
| GET | `/indicadores/comprometimento?mes=AAAA-MM` | — | `200` renda, despesas essenciais/não essenciais, percentuais e `nivel` (`NORMAL`, `ATENCAO`, `RISCO` ou `SEM_RENDA`) do mês (padrão: mês atual) |

## Protótipo

Link do Figma: _adicionar aqui_

## Equipe

_adicionar nomes dos integrantes_

## Documentação

- Regras de negócio e arquitetura: `backend/CLAUDE.md`
- Proposta técnica completa: pasta compartilhada no Teams da equipe
