export type CampoValidacaoMaterial = "tipo" | "quantidade";

export interface FalhaValidacaoMaterial {
  campo: CampoValidacaoMaterial;
  mensagem: string;
}

export interface ValidadeInputMaterial {
  valid: boolean;
  badInput: boolean;
  validationMessage?: string;
}

export interface EntradaValidacaoMaterial {
  tipo: string;
  quantidade: string;
  validadeQuantidade?: ValidadeInputMaterial;
}

export type ResultadoValidacaoMaterial =
  | { ok: true; tipo: string; quantidade: number }
  | { ok: false; falha: FalhaValidacaoMaterial };

export const MENSAGENS_VALIDACAO_MATERIAL = {
  tipoObrigatorio: "Informe o nome ou especificação do insumo.",
  tipoMuitoLongo: "O nome do insumo não pode exceder 200 caracteres.",
  quantidadePositiva: "A quantidade deve ser um número positivo maior que zero.",
  quantidadeInteira: "A quantidade deve ser um número inteiro positivo.",
  quantidadeInvalidaNativa: "Informe uma quantidade numérica inteira válida.",
} as const;

/** Validação pura para cadastro e edição de materiais compatível com INT do schema. */
export function validarFormularioMaterial({
  tipo,
  quantidade,
  validadeQuantidade,
}: EntradaValidacaoMaterial): ResultadoValidacaoMaterial {
  const tipoTrim = tipo.trim();
  if (!tipoTrim) {
    return {
      ok: false,
      falha: { campo: "tipo", mensagem: MENSAGENS_VALIDACAO_MATERIAL.tipoObrigatorio },
    };
  }
  if (tipoTrim.length > 200) {
    return {
      ok: false,
      falha: { campo: "tipo", mensagem: MENSAGENS_VALIDACAO_MATERIAL.tipoMuitoLongo },
    };
  }

  if (validadeQuantidade?.badInput) {
    return {
      ok: false,
      falha: {
        campo: "quantidade",
        mensagem:
          validadeQuantidade.validationMessage?.trim() ||
          MENSAGENS_VALIDACAO_MATERIAL.quantidadeInvalidaNativa,
      },
    };
  }

  const qtdTrim = quantidade.trim();
  if (!qtdTrim) {
    return {
      ok: false,
      falha: { campo: "quantidade", mensagem: MENSAGENS_VALIDACAO_MATERIAL.quantidadePositiva },
    };
  }

  const qtdNum = Number(qtdTrim);
  if (!Number.isFinite(qtdNum) || qtdNum <= 0) {
    return {
      ok: false,
      falha: { campo: "quantidade", mensagem: MENSAGENS_VALIDACAO_MATERIAL.quantidadePositiva },
    };
  }

  if (!Number.isSafeInteger(qtdNum)) {
    return {
      ok: false,
      falha: { campo: "quantidade", mensagem: MENSAGENS_VALIDACAO_MATERIAL.quantidadeInteira },
    };
  }

  if (validadeQuantidade && !validadeQuantidade.valid) {
    return {
      ok: false,
      falha: {
        campo: "quantidade",
        mensagem:
          validadeQuantidade.validationMessage?.trim() ||
          MENSAGENS_VALIDACAO_MATERIAL.quantidadeInvalidaNativa,
      },
    };
  }

  return { ok: true, tipo: tipoTrim, quantidade: qtdNum };
}
