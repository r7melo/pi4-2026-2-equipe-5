export const TIPOS_PRODUTO_CANONICOS = [
  "Módulo Fotovoltaico",
  "Inversor",
  "Estrutura de Fixação",
  "Cabeamento",
  "Proteção Elétrica",
  "Acessório",
] as const;

export const UNIDADES_PRODUTO_CANONICAS = [
  "un",
  "m",
  "kit",
  "cx",
  "par",
  "rolo",
] as const;

export type CampoValidacaoProduto = "nome" | "tipo" | "unidade" | "precoUnitario";

export interface FalhaValidacaoProduto {
  campo: CampoValidacaoProduto;
  mensagem: string;
}

export interface EntradaValidacaoProduto {
  nome: string;
  tipo: string;
  unidade: string;
  precoUnitario: string;
  ativo: boolean;
}

export type ResultadoValidacaoProduto =
  | {
      ok: true;
      dados: {
        nome: string;
        tipo: string;
        unidade: string;
        precoUnitario: number;
        ativo: boolean;
      };
    }
  | { ok: false; falha: FalhaValidacaoProduto };

export const MENSAGENS_VALIDACAO_PRODUTO = {
  nomeObrigatorio: "Informe o nome comercial do produto.",
  nomeMuitoLongo: "O nome do produto não pode exceder 200 caracteres.",
  tipoObrigatorio: "Selecione ou informe a categoria do produto.",
  tipoMuitoLongo: "A categoria do produto não pode exceder 200 caracteres.",
  unidadeObrigatoria: "Informe a unidade de medida (ex: un, m, kit).",
  unidadeMuitoLonga: "A unidade de medida não pode exceder 30 caracteres.",
  precoObrigatorio: "Informe o preço unitário de referência.",
  precoInvalido: "Informe um preço unitário válido (maior ou igual a zero).",
  precoLimiteExcedido: "O preço unitário excede o limite máximo permitido.",
} as const;

export function parsearPrecoUnitario(bruto: string): number | null {
  const limpo = bruto.trim().replace(/\s+/g, "");
  if (!limpo) return null;

  let normalizado = limpo;
  if (limpo.includes(",") && limpo.includes(".")) {
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else if (limpo.includes(",")) {
    normalizado = limpo.replace(",", ".");
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalizado)) return null;
  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) return null;
  return Math.round(numero * 100) / 100;
}

export function validarFormularioProduto(entrada: EntradaValidacaoProduto): ResultadoValidacaoProduto {
  const nome = entrada.nome.trim();
  if (!nome) {
    return { ok: false, falha: { campo: "nome", mensagem: MENSAGENS_VALIDACAO_PRODUTO.nomeObrigatorio } };
  }
  if (nome.length > 200) {
    return { ok: false, falha: { campo: "nome", mensagem: MENSAGENS_VALIDACAO_PRODUTO.nomeMuitoLongo } };
  }

  const tipo = entrada.tipo.trim();
  if (!tipo) {
    return { ok: false, falha: { campo: "tipo", mensagem: MENSAGENS_VALIDACAO_PRODUTO.tipoObrigatorio } };
  }
  if (tipo.length > 200) {
    return { ok: false, falha: { campo: "tipo", mensagem: MENSAGENS_VALIDACAO_PRODUTO.tipoMuitoLongo } };
  }

  const unidade = entrada.unidade.trim();
  if (!unidade) {
    return { ok: false, falha: { campo: "unidade", mensagem: MENSAGENS_VALIDACAO_PRODUTO.unidadeObrigatoria } };
  }
  if (unidade.length > 30) {
    return { ok: false, falha: { campo: "unidade", mensagem: MENSAGENS_VALIDACAO_PRODUTO.unidadeMuitoLonga } };
  }

  if (!entrada.precoUnitario.trim()) {
    return { ok: false, falha: { campo: "precoUnitario", mensagem: MENSAGENS_VALIDACAO_PRODUTO.precoObrigatorio } };
  }

  const preco = parsearPrecoUnitario(entrada.precoUnitario);
  if (preco === null || preco < 0) {
    return { ok: false, falha: { campo: "precoUnitario", mensagem: MENSAGENS_VALIDACAO_PRODUTO.precoInvalido } };
  }
  if (preco >= 10_000_000_000) {
    return { ok: false, falha: { campo: "precoUnitario", mensagem: MENSAGENS_VALIDACAO_PRODUTO.precoLimiteExcedido } };
  }

  return {
    ok: true,
    dados: {
      nome,
      tipo,
      unidade,
      precoUnitario: preco,
      ativo: entrada.ativo,
    },
  };
}
