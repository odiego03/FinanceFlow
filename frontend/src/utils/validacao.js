// Mesmas regras de backend/.../dto/RegrasValidacao.java; se mudar lá, muda aqui

const EMAIL_COM_DOMINIO = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/

export const REQUISITOS_SENHA = [
  { id: 'tamanho', texto: 'Pelo menos 6 caracteres', atende: (senha) => senha.length >= 6 },
  { id: 'maiuscula', texto: 'Uma letra maiúscula', atende: (senha) => /\p{Lu}/u.test(senha) },
  { id: 'numero', texto: 'Um número', atende: (senha) => /\d/.test(senha) },
]

export function senhaForte(senha) {
  return REQUISITOS_SENHA.every((requisito) => requisito.atende(senha))
}

export function emailValido(email) {
  return EMAIL_COM_DOMINIO.test(email.trim())
}

export const MENSAGEM_SENHA = 'A senha precisa ter pelo menos 6 caracteres, uma letra maiúscula e um número.'
export const MENSAGEM_EMAIL = 'E-mail inválido: use o formato nome@dominio.com.'
