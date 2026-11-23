export const MENSAGEM_RECUPERACAO = "Se o e-mail informado estiver cadastrado, você receberá as instruções de redefinição";
export const MENSAGEM_TROCA_INCERTA = "Não foi possível confirmar a troca. Confira sua conexão e tente entrar com a nova senha antes de repetir a operação.";

export function requisitosSenha(senha: string) {
  return [
    { texto: "Pelo menos 8 caracteres", atende: Array.from(senha).length >= 8 },
    { texto: "Uma letra maiúscula", atende: /[A-Z]/.test(senha) },
    { texto: "Uma letra minúscula", atende: /[a-z]/.test(senha) },
    { texto: "Um número", atende: /[0-9]/.test(senha) },
    { texto: "No máximo 72 bytes", atende: new TextEncoder().encode(senha).length <= 72 },
  ];
}
export function senhaValida(senha: string): boolean {
  return requisitosSenha(senha).every(item => item.atende);
}
