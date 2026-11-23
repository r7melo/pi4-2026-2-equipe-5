export type CampoValidacaoMaterial = "produtoId" | "tipo" | "quantidade" | "quantidadeUtilizada";

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
  produtoId?: number | null;
  exigirProduto?: boolean;
  tipo: string;
  quantidade: string;
  quantidadeUtilizada?: string;
  validadeQuantidade?: ValidadeInputMaterial;
}

export type ResultadoValidacaoMaterial =
  | {
      ok: true;
      produtoId?: number;
      tipo: string;
      quantidade: number;
      quantidadeUtilizada?: number | null;
    }
  | { ok: false; falha: FalhaValidacaoMaterial };

export const MENSAGENS_VALIDACAO_MATERIAL = {
  produtoObrigatorio: "Selecione um produto ativo do catálogo.",
  tipoObrigatorio: "Informe o nome ou especificação do insumo.",
  tipoMuitoLongo: "O nome do insumo não pode exceder 200 caracteres.",
  quantidadePositiva: "A quantidade deve ser um número positivo maior que zero.",
  quantidadeInteira: "A quantidade deve ser um número inteiro positivo.",
  quantidadeInvalidaNativa: "Informe uma quantidade numérica inteira válida.",
  quantidadeUtilizadaInvalida: "A quantidade utilizada deve ser um número inteiro maior ou igual a zero.",
  quantidadeUtilizadaExcedida: "A quantidade utilizada não pode ser maior que a quantidade solicitada.",
} as const;

/** Validação pura para cadastro e edição de materiais compatível com INT do schema. */
export function validarFormularioMaterial({
  produtoId,
  exigirProduto,
  tipo,
  quantidade,
  quantidadeUtilizada,
  validadeQuantidade,
}: EntradaValidacaoMaterial): ResultadoValidacaoMaterial {
  if (exigirProduto && (!produtoId || !Number.isSafeInteger(produtoId) || produtoId <= 0)) {
    return {
      ok: false,
      falha: { campo: "produtoId", mensagem: MENSAGENS_VALIDACAO_MATERIAL.produtoObrigatorio },
    };
  }

  const tipoTrim = tipo.trim();
  if (!exigirProduto && !tipoTrim) {
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

  let qtdUtilizadaNum: number | null | undefined = undefined;
  if (quantidadeUtilizada !== undefined) {
    const utilizadaTrim = quantidadeUtilizada.trim();
    if (!utilizadaTrim) {
      qtdUtilizadaNum = null;
    } else {
      const parsed = Number(utilizadaTrim);
      if (!Number.isFinite(parsed) || parsed < 0 || !Number.isSafeInteger(parsed)) {
        return {
          ok: false,
          falha: {
            campo: "quantidadeUtilizada",
            mensagem: MENSAGENS_VALIDACAO_MATERIAL.quantidadeUtilizadaInvalida,
          },
        };
      }
      if (parsed > qtdNum) {
        return {
          ok: false,
          falha: {
            campo: "quantidadeUtilizada",
            mensagem: MENSAGENS_VALIDACAO_MATERIAL.quantidadeUtilizadaExcedida,
          },
        };
      }
      qtdUtilizadaNum = parsed;
    }
  }

  return {
    ok: true,
    ...(produtoId && produtoId > 0 ? { produtoId } : {}),
    tipo: tipoTrim,
    quantidade: qtdNum,
    ...(qtdUtilizadaNum !== undefined ? { quantidadeUtilizada: qtdUtilizadaNum } : {}),
  };
}
