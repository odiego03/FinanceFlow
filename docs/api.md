# Rotas da API

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
