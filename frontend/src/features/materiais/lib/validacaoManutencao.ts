export const LIMITE_CARACTERES_MANUTENCAO = 500;

export const MENSAGENS_VALIDACAO_MANUTENCAO = {
  servicoObrigatorio: "Descreva o serviço executado antes de concluir a manutenção.",
  servicoMuitoLongo: "A descrição do serviço executado não pode exceder 500 caracteres.",
  servicoCaractereInvalido: "A descrição do serviço contém caracteres inválidos.",
  comentarioObrigatorio: "Escreva uma observação antes de enviar o comentário.",
  comentarioMuitoLongo: "O comentário não pode exceder 500 caracteres.",
  comentarioCaractereInvalido: "O comentário contém caracteres inválidos.",
} as const;

export type ResultadoValidacaoTextoManutencao =
  | { ok: true; texto: string }
  | { ok: false; mensagem: string };

function validarTextoManutencao(
  valor: string,
  mensagens: {
    obrigatorio: string;
    muitoLongo: string;
    caractereInvalido: string;
  }
): ResultadoValidacaoTextoManutencao {
  if (valor.includes("\0")) {
    return { ok: false, mensagem: mensagens.caractereInvalido };
  }
  const limpo = valor.trim();
  if (!limpo) {
    return { ok: false, mensagem: mensagens.obrigatorio };
  }
  if (limpo.length > LIMITE_CARACTERES_MANUTENCAO) {
    return { ok: false, mensagem: mensagens.muitoLongo };
  }
  return { ok: true, texto: limpo };
}

export function validarConclusaoManutencao(
  servicoExecutado: string
): ResultadoValidacaoTextoManutencao {
  return validarTextoManutencao(servicoExecutado, {
    obrigatorio: MENSAGENS_VALIDACAO_MANUTENCAO.servicoObrigatorio,
    muitoLongo: MENSAGENS_VALIDACAO_MANUTENCAO.servicoMuitoLongo,
    caractereInvalido: MENSAGENS_VALIDACAO_MANUTENCAO.servicoCaractereInvalido,
  });
}

export function validarComentarioManutencao(
  descricao: string
): ResultadoValidacaoTextoManutencao {
  return validarTextoManutencao(descricao, {
    obrigatorio: MENSAGENS_VALIDACAO_MANUTENCAO.comentarioObrigatorio,
    muitoLongo: MENSAGENS_VALIDACAO_MANUTENCAO.comentarioMuitoLongo,
    caractereInvalido: MENSAGENS_VALIDACAO_MANUTENCAO.comentarioCaractereInvalido,
  });
}
