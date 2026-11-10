// Trechos de descrição de extrato que são só dado bancário: CPF/CNPJ (mascarado ou não), agência, conta, código do banco
const DADO_BANCARIO = /•|\d{3}\.\d{3}|\d{2}\.\d{3}\.\d{3}|agência|conta:|\(\d{3,4}\)/i

const OPERACOES = [
  [/^transferência enviada pelo pix$/i, 'Pix enviado'],
  [/^transferência recebida pelo pix$/i, 'Pix recebido'],
  [/^compra no débito via nupay$/i, 'Débito (NuPay)'],
  [/^compra no débito$/i, 'Débito'],
  [/^compra no crédito$/i, 'Crédito'],
  [/^pagamento de boleto efetuado$/i, 'Boleto pago'],
]

const MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])

// "MARIA DA SILVA" → "Maria da Silva"; nomes que já têm minúscula ficam como estão
function capitalizar(texto) {
  if (texto !== texto.toUpperCase() || texto.length <= 3) return texto
  return texto
    .toLowerCase()
    .split(' ')
    .map((palavra, indice) =>
      indice > 0 && MINUSCULAS.has(palavra) ? palavra : palavra.charAt(0).toUpperCase() + palavra.slice(1),
    )
    .join(' ')
}

/**
 * Resume a descrição longa do extrato pra caber numa linha:
 * "Transferência enviada pelo Pix - MARIA OLIVEIRA - 000.000.000-00 - BANCO (000) Agência: 1 Conta: 12"
 * vira { titulo: "Maria Oliveira", detalhe: "Pix enviado" }. Descrição comum volta como está, sem detalhe.
 */
export function resumirDescricao(texto) {
  if (!texto) return { titulo: '', detalhe: null }
  const partes = texto.split(' - ').map((parte) => parte.trim())
  const fimUtil = partes.findIndex((parte) => DADO_BANCARIO.test(parte))
  const uteis = fimUtil === -1 ? partes : partes.slice(0, fimUtil)
  if (uteis.length < 2) return { titulo: uteis[0] ?? texto, detalhe: null }

  // Só separa quando o começo é uma operação de banco conhecida; "Aluguel - apto 12" digitado à mão fica inteiro
  const operacao = OPERACOES.find(([padrao]) => padrao.test(uteis[0]))
  if (!operacao) return { titulo: uteis.join(' - '), detalhe: null }
  return { titulo: capitalizar(uteis.slice(1).join(' - ')), detalhe: operacao[1] }
}
