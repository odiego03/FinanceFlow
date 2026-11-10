---
name: novo-componente-frontend
description: Use ao criar uma nova página ou componente React no frontend do FinanceFlow. Garante que a estrutura de pastas, o CSS Module, o serviço Axios e o uso do Context sigam o padrão já definido no projeto.
---

# Nova página/componente no frontend (React)

## 1. Definir onde entra

- Componente reutilizável (botão, input, card genérico) → `src/components/`
- Tela completa (Login, Dashboard, listagem) → `src/pages/`

## 2. Criar o par de arquivos

```
NomeDoComponente.jsx
NomeDoComponente.module.css
```

Sempre na mesma pasta, nome em `PascalCase`.

## 3. Se a tela consome a API

- Não chamar Axios direto no componente — usar o service
  correspondente em `src/services/` (ex: `transacaoService.js`).
- Se o service do recurso ainda não existir, criar seguindo o
  padrão de `services/api.js` (instância Axios base já com o
  interceptor de token). Serviços atuais: `usuario`, `categoria`,
  `transacao`, `meta`, `indicadorMercado`, `comprometimento`.
- Nos `catch`, mostrar o erro com `mensagemDeErro(erro, "texto padrão")`
  de `services/api.js` em vez de texto fixo — assim o motivo enviado
  pelo backend (ex: `409`, `400`) aparece para o usuário.
- Um `401` de requisição autenticada já é tratado no interceptor
  (desloga e volta ao login); não tratar isso na tela.

## 4. Se a tela exige usuário logado

- Envolver a rota com `RotaProtegida`.
- Consumir dados do usuário/token via `AuthContext`, nunca acessando
  `localStorage` diretamente no componente.

## 5. Nomenclatura de domínio

Usar os mesmos nomes em português do backend (`usuario`, `categoria`,
`transacao`, `meta`, `contribuicao`), nunca traduzir para inglês no meio do caminho.

## Antes de implementar

Confirme com o usuário se a tela faz parte do escopo da Sprint atual
(ver `frontend/CLAUDE.md`, seções "Sprint#1/#2/#3 — Telas"; a Sprint#3
é a atual).

Modais ficam em `src/components/` (`ModalNome.jsx` + `.module.css`) e
reutilizam `ModalConfirmacao` para confirmações de exclusão.
