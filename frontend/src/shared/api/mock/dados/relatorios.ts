import type { RelatorioCusto } from "@/types";
import { obterObrasArmazenadas } from "./obras";
import { obterMateriaisArmazenados } from "./materiais";
import { lerDadosCenario } from "../core/estadoCenario";

/**
 * Obtém o relatório de custos da obra ou calcula dinamicamente se for uma nova obra.
 */
export function obterRelatorioArmazenado(obraId: number): RelatorioCusto | null {
  const obra = obterObrasArmazenadas().find(o => o.id === obraId);
  const relatorio = lerDadosCenario<Record<number, RelatorioCusto>>("mock_relatorios_v1")[obraId];
  if (!obra || obra.status !== "Concluido" || !relatorio) return null;
  return { ...relatorio, balancoMateriais: obterMateriaisArmazenados().filter(m => m.obraId === obraId).map(m => ({
    tipo: m.descricao ?? m.tipo ?? "", unidade: m.unidade ?? "", quantidadeComprada: m.quantidade,
    quantidadeUtilizada: m.statusLogistico === "Utilizado" ? m.quantidade : 0,
  })) };
}
