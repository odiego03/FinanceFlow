# FinanceFlow — Sprint#4 (encerramento)

Registro do que foi feito na última sprint, pensado como matéria-prima para o texto do TCC. Cada seção diz **o que**
foi feito, **por que** e **onde está no código**. Os detalhes de implementação ficam em `backend/CLAUDE.md` e
`frontend/CLAUDE.md`; aqui está o resumo para escrever a documentação.

Branch: `feature/sprint4` → PR único para a `main`.

---

## 1. Visão geral

A Sprint#4 fechou as regras de negócio que faltavam (RN004, RN005 e RN006), acrescentou funcionalidades de apoio
(perfil, preferências, relatórios, tema escuro, tutorial) e terminou com uma **auditoria completa do sistema**,
seguida da correção de tudo o que ela apontou e de um redesenho das telas mais usadas.

| Área | Entregas |
|---|---|
| Regras de negócio | Parcelamento (RN004), Simulação de investimento (RN005), Sugestões personalizadas (RN006) |
| Funcionalidades de apoio | Configurações (perfil, senha, preferências), Relatórios mensal e anual, tema escuro, exclusão em massa, tutorial de primeiro acesso, exportação CSV |
| Simulador (ampliado) | Inflação (IPCA) e "dinheiro de hoje", modo meta ("quanto preciso investir por mês"), uso da sobra real do usuário |
| Qualidade e segurança | Auditoria, migrações com Flyway, testes de integração, limite de tentativas de login, validações, tratamento de erros único |
| Interface | Novo cabeçalho e marca, Dashboard e Transações redesenhados, modais padronizados, paginação, carregamento com esqueletos, sem emojis |

---

## 2. Regras de negócio implementadas

### RN004 — Parcelamento

- Ao parcelar uma despesa, o valor é dividido igualmente: cada parcela é arredondada para baixo em centavos e o que
  sobra vai na última, então a soma sempre bate com o total.
- As parcelas são geradas automaticamente, uma por mês, a partir da data da primeira.
- **Sugestão de parcelas pela margem livre:** margem livre = renda média − despesas médias − parcelas já agendadas
  (média dos 3 meses completos anteriores). O sistema sugere a **menor quantidade de parcelas cuja parcela cabe na
  margem**. Decisão registrada: a margem limita o *valor* da parcela, não a quantidade.
- Parcela não é editada nem excluída sozinha (quebraria a soma): exclui-se o parcelamento inteiro; as parcelas já
  vencidas ficam no histórico.
- Código: `ParcelamentoService`, `CalculadoraParcelamento` (testada), `ModalTransacao` (front).

### RN005 — Simulação de investimento

- Taxas da API pública do Banco Central (SGS): Selic (432), CDI (4389), poupança (195) e, nesta sprint, IPCA de 12
  meses (13522). Cache de 1 hora; se a API falhar, usa o último valor obtido.
- Três cenários: Poupança (isenta de IR), CDB (% do CDI configurável) e Tesouro Selic.
- Juros compostos mês a mês; **IR regressivo calculado por depósito**, pelo tempo que cada aporte ficou aplicado
  (22,5% / 20% / 17,5% / 15%), que é como a Receita cobra.
- **Novidades do fim da sprint:**
  - **Inflação:** cada resultado também aparece "em dinheiro de hoje" (descontado o IPCA) e com o selo "ganha/perde
    da inflação". O investido também é descontado mês a mês, para a comparação ser justa.
  - **Modo meta:** o usuário informa quanto quer juntar e em quanto tempo (ou escolhe uma de suas Metas) e o sistema
    calcula o **aporte mensal necessário** em cada investimento, já descontado o IR. Como o IR por depósito não tem
    fórmula fechada, o cálculo usa **busca binária** sobre o valor do aporte (em centavos).
  - **Sobra real:** botão que preenche o aporte com a sobra média do próprio usuário (renda − despesas − parcelas).
  - **Destaques automáticos:** diferença entre o melhor e o pior investimento, quem perde da inflação e o mês em que
    os juros passam a render mais que o aporte (efeito dos juros compostos).
- Código: `SimulacaoService`, `CalculadoraInvestimento` (testada), `IndicadorMercadoService`, `pages/Simulacao.jsx`.

### RN006 — Sugestões personalizadas

- Geradas por regras a partir do Indicador de comprometimento (regra 50/30/20), das metas, dos parcelamentos e da
  Simulação. Cada sugestão tem severidade (Alerta, Atenção, Dica), título, mensagem com valores e os itens que mais
  pesaram.
- Regras: reduzir gastos (risco), reduzir essenciais (atenção), sem renda, investir a sobra (com a projeção do melhor
  investimento), meta vencida / atrasada / no prazo, parcelas acima da margem.
- Código: `RegrasSugestao` (classe pura, testada), `SugestaoService`, `components/PainelSugestoes.jsx`.

---

## 3. Funcionalidades de apoio

- **Configurações** (antes "Meu Perfil"), em abas:
  - Meu perfil: nome, e-mail, data de criação da conta, troca de senha, sair.
  - Aparência e privacidade: tema claro/escuro/automático e "ocultar valores em R$".
  - Alertas e simulador: limites do alerta de comprometimento e padrões do simulador.
  - Dados: exportar todas as transações em CSV, restaurar categorias padrão, excluir transações por período (com
    prévia e confirmação digitando EXCLUIR).
  - Ajuda: rever o tutorial, perguntas frequentes, sobre.
- **Preferências salvas na conta** (valem em qualquer computador): tema, ocultar valores, limites do alerta, padrões
  do simulador.
- **Relatórios** mensal e anual: resumo com taxa de poupança, comparação com o período anterior, despesas e receitas
  por categoria, maiores despesas, evolução mês a mês (anual), exportação CSV e impressão/PDF.
- **Tema escuro**, aplicado antes de a página montar (sem "piscar" claro).
- **Tutorial de primeiro acesso:** 7 passos explicando cada tela; aparece uma vez por conta (guardado no backend) e
  pode ser revisto em Configurações → Ajuda.

---

## 4. Auditoria do sistema e correções

No fim da sprint foi feita uma auditoria de segurança, regras de negócio, desempenho e qualidade. Todos os pontos
foram tratados, exceto os registrados em "Limitações conhecidas" (seção 9).

### 4.1 Segurança

| Problema encontrado | Correção |
|---|---|
| Segredo do JWT com valor padrão no código (qualquer um forjaria tokens se a variável faltasse) | Sem valor padrão: o backend não sobe sem `JWT_SECRET` |
| Login sem limite de tentativas | Bloqueio por 15 minutos depois de 5 senhas erradas no mesmo e-mail (HTTP 429) |
| E-mail diferenciando maiúsculas ("Diego@" e "diego@" viravam contas diferentes) | E-mail gravado em minúsculas e comparado sem diferenciar; contas antigas continuam entrando |
| Dependência do frontend com vulnerabilidade alta (`follow-redirects`) | Atualizada (`npm audit` sem vulnerabilidades) |
| Containers Docker rodando como root | Usuário sem privilégio no backend e nginx sem root no frontend |

Decisão do grupo: **o cadastro não exige tamanho mínimo de senha**, para facilitar a criação de contas de teste. A
troca de senha continua exigindo 6 caracteres.

### 4.2 Regras de negócio e consistência

| Problema | Correção |
|---|---|
| Categoria com transações ou metas podia trocar de tipo (receita ↔ despesa), quebrando RN003 e RN007 | Bloqueado com HTTP 409 |
| Duas contribuições simultâneas para a mesma meta podiam passar do saldo | Trava pessimista no banco (`PESSIMISTIC_WRITE`) na meta e na transação |
| Cadastro de usuário podia ficar gravado pela metade se a criação das categorias falhasse | Cadastro em transação (`@Transactional`) |
| Textos e valores muito grandes estouravam o banco e viravam erro 500 | Limites de tamanho e de valor nos DTOs (resposta 400 com mensagem) |

### 4.3 Robustez

- **Chamadas às APIs externas sem timeout** (BCB, Yahoo): um serviço travado prendia o sistema todo. Agora há
  timeout de 3 s para conectar e 5 s para ler.
- **Tratamento de erros único:** todas as exceções de regra de negócio estendem `NegocioException`, que carrega o
  status HTTP; um único handler responde a todas. Erros inesperados agora são registrados em log, e rota inexistente,
  método errado e arquivo grande demais têm status próprios (404, 405, 413), em vez de 500.
- **Bug encontrado durante os testes:** o BCB às vezes devolve o JSON com o cabeçalho `text/html`, e a taxa aparecia
  como "indisponível" de forma intermitente. A resposta passou a ser lida como texto e convertida manualmente.

### 4.4 Banco de dados

- **Migrações com Flyway** no lugar do `ddl-auto=update` do Hibernate: o esquema agora é versionado
  (`backend/src/main/resources/db/migration`).
  - V1: esquema existente (no banco já em uso, marcada como *baseline*, sem recriar nada).
  - V2: índices nas chaves estrangeiras (o PostgreSQL não cria sozinho).
  - V3: coluna do tutorial concluído.
- O Hibernate passou a só **validar** se as entidades batem com o banco (`ddl-auto=validate`).

### 4.5 Desempenho

- Consultas por período no banco, em vez de carregar todo o histórico do usuário e filtrar em memória (evolução,
  relatórios, sugestões, indicador, exclusão em massa).
- Soma das contribuições de todas as metas numa consulta só (antes, uma por meta).
- Confirmação da importação de extrato carregando categorias e regras de uma vez (antes, cerca de 3 consultas por
  linha).

---

## 5. Testes

| Tipo | O que cobre | Quantidade |
|---|---|---|
| Unitários (classes puras) | Cálculos de parcelamento, investimento (IR, inflação, aporte necessário), comprometimento, relatórios, regras de sugestão, parsers de extrato (Nubank e Itaú), sugestão de categoria | 67 |
| Integração da API | Sobe a aplicação inteira com banco H2 em modo PostgreSQL, rodando as mesmas migrações do Flyway: isolamento entre usuários, 401/404, troca de tipo de categoria, limites de valor, saldo de contribuição, bloqueio de login, tutorial | 8 |
| **Total** | `./mvnw test`, sem precisar do banco real | **75** |

Além disso, as telas redesenhadas foram verificadas com um roteiro automatizado no navegador (criar despesa e
receita, destinar à meta, parcelar, editar, excluir, validação, paginação), com capturas de tela nos temas claro e
escuro e no tamanho de celular.

---

## 6. Interface (UX/UI)

- **Marca:** logo próprio (gráfico subindo), em dourado sobre preto no tema claro e dourado sobre branco no escuro;
  também no ícone da aba do navegador.
- **Cabeçalho:** nome da tela atual, atalho claro/escuro, ocultar valores e menu do usuário (perfil, configurações,
  tutorial, sair).
- **Dashboard:** saudação, seletor de mês com setas, atalho "Lançar transação", cards com comparação com o mês
  anterior, medidor de comprometimento da renda com o limite marcado, sugestões, gráficos de evolução e por categoria,
  últimas transações.
- **Transações:** cards de entradas/saídas/saldo do filtro, filtros enxutos ("Mais filtros"), lista agrupada por dia,
  descrições de extrato resumidas ("Transferência enviada pelo Pix - MARIA ... Agência ... Conta ..." vira "Maria" +
  "Pix enviado"), bloco separado para parcelas futuras ("Agendadas") e **paginação**.
- **Modais padronizados:** cabeçalho com X, rolagem interna e botões sempre visíveis; fecham com Esc; no celular
  sobem de baixo.
- **Carregamento com esqueletos** (blocos no formato do conteúdo) no lugar de "Carregando...".
- **Sem emojis:** todos os ícones são do Bootstrap Icons.
- **Acessibilidade:** status sempre com ícone + texto (nunca só cor), leitores de tela anunciam o carregamento,
  respeito à preferência de "menos animação", foco inicial em "Cancelar" nas confirmações de exclusão.

---

## 7. API — rotas novas nesta sprint

| Método e rota | Para quê |
|---|---|
| `POST /parcelamentos`, `GET /parcelamentos`, `GET/DELETE /parcelamentos/{id}` | Parcelamento (RN004) |
| `GET /parcelamentos/sugestao` | Margem livre e quantidade mínima de parcelas |
| `POST /simulacoes`, `GET /simulacoes/taxas` | Simulação (RN005) |
| `POST /simulacoes/aporte-necessario` | Modo meta do simulador |
| `GET /sugestoes?mes=AAAA-MM` | Sugestões (RN006) |
| `PUT /usuarios/me`, `PUT /usuarios/me/senha` | Perfil e troca de senha |
| `GET/PUT /usuarios/me/preferencias`, `PUT /usuarios/me/preferencias/tutorial` | Preferências e tutorial |
| `GET /transacoes/exclusao-em-massa/previa`, `DELETE /transacoes/exclusao-em-massa` | Exclusão por período |
| `GET /relatorios?tipo=MENSAL\|ANUAL&referencia=` | Relatórios |
| `GET /actuator/health` | Healthcheck do Docker |

---

## 8. Como rodar (mudanças desta sprint)

- `application-local.properties` precisa de `jwt.chave-secreta=...` (qualquer texto com 32+ caracteres).
- No Docker, `JWT_SECRET` é obrigatório no `.env`; o frontend só sobe depois do healthcheck do backend.
- Mudança de esquema do banco = novo arquivo `V<n>__descricao.sql` em `db/migration` (nunca editar um que já rodou).

---

## 9. Limitações conhecidas (para a seção de trabalhos futuros)

- O token continua valendo até expirar (8 h) depois de uma troca de senha; revogar exigiria consultar o banco a cada
  requisição.
- O limite de tentativas de login fica em memória: zera ao reiniciar e vale para uma instância só.
- Na importação, os inserts continuam um por linha (o id é gerado pelo banco com `IDENTITY`).
- "Dinheiro de hoje" supõe que a inflação dos últimos 12 meses se repete no prazo todo.
- O Tesouro Selic é simulado sem a taxa de custódia da B3, e o IOF é ignorado (prazo mínimo de 1 mês).
- O parser do Itaú foi escrito sobre o layout mais comum conhecido, sem um arquivo real exportado.

---

## 10. Roteiro sugerido para a apresentação

1. Login → tutorial de primeiro acesso.
2. Importar um extrato do Nubank: categorias sugeridas e aprendidas, duplicatas detectadas, destinar receitas a uma
   meta.
3. Dashboard: comparação com o mês anterior, medidor de comprometimento e sugestões.
4. Parcelar uma compra e mostrar a sugestão de parcelas pela margem livre.
5. Simulador: poupança perdendo da inflação; modo meta com uma das metas; "usar minha sobra".
6. Relatório anual e exportação em PDF/CSV.
7. Tema escuro e ocultar valores.
8. Qualidade: `./mvnw test` com 75 testes passando; migrações do Flyway.
