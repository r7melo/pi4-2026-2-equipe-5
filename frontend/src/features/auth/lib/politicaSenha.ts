export const MENSAGEM_RECUPERACAO = "Se o e-mail informado estiver cadastrado, você receberá as instruções de redefinição";
export const MENSAGEM_TROCA_INCERTA = "Não foi possível confirmar a troca. Tente entrar com a nova senha; se necessário, solicite outro link";

export function requisitosSenha(senha: string) {
  return [
    { texto: "Pelo menos 8 caracteres", atende: Array.from(senha).length >= 8 },
    { texto: "Uma letra maiúscula", atende: /[A-Z]/.test(senha) },
    { texto: "Uma letra minúscula", atende: /[a-z]/.test(senha) },
    { texto: "Um número", atende: /[0-9]/.test(senha) },
  ];
}
export function senhaValida(senha: string): boolean {
  return requisitosSenha(senha).every(item => item.atende);
}
