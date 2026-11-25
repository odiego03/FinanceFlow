# Roadmap e funcionalidades por entrega

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

O registro completo da sprint, pensado como matéria-prima para o texto do TCC, está em [`docs/sprint4.md`](sprint4.md).

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

- [x] Testes automatizados: cálculos das regras, parsers, sugestão de categoria e testes de integração da API (ver a seção 6 do README)
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
