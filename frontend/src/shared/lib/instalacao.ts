import type { DadosInstalacao, FaltanteInstalacao, GrupoDadoAusente } from "@/shared/types/exportacaoInstalacao";
import { dataCivilValida, periodoCivilValido } from "@/shared/lib/datasCivis";

export function normalizarTextoInstalacao(valor?: string | null): string | null {
  return valor?.trim() || null;
}

export function dataInstalacaoValida(valor?: string | null): boolean {
  return dataCivilValida(valor);
}

export function avaliarCompletudeInstalacao(dados: DadosInstalacao): FaltanteInstalacao[] {
  const faltantes: FaltanteInstalacao[] = [];
  if (!dados.materiais.some((m) => m.quantidade !== null && m.quantidade > 0)) faltantes.push({ grupo: "materiais" });
  if (!normalizarTextoInstalacao(dados.endereco)) faltantes.push({ grupo: "endereco" });
  if (!normalizarTextoInstalacao(dados.observacoesTecnicas)) faltantes.push({ grupo: "observacoes" });
  if (dados.programacoes.length === 0) faltantes.push({ grupo: "equipes" }, { grupo: "periodos" });
  for (const p of dados.programacoes) {
    if (!normalizarTextoInstalacao(p.nomeEquipe)) faltantes.push({ grupo: "equipes", programacaoId: p.id });
    if (!periodoCivilValido(p.dataInicio, p.dataFim)) {
      faltantes.push({ grupo: "periodos", programacaoId: p.id });
    }
  }
  return faltantes;
}

const rotulos: Record<GrupoDadoAusente, string> = {
  materiais: "Kit de materiais não informado",
  endereco: "Endereço não informado",
  equipes: "Equipe não informada",
  periodos: "Período não informado ou inválido",
  observacoes: "Observações técnicas não informadas",
};
export function descreverFaltanteInstalacao(faltante: FaltanteInstalacao): string {
  const complemento = faltante.programacaoId === undefined ? "" : ` — programação #${faltante.programacaoId}`;
  return rotulos[faltante.grupo] + complemento;
}
