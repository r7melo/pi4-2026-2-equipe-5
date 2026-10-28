import { lerDadosCenario } from "../core/estadoCenario";
import type { DadosHomologacao } from "@/types";

export function obterHomologacaoObraArmazenada(obraId: number): DadosHomologacao {
  return lerDadosCenario<Record<number, DadosHomologacao>>("mock_homologacoes_v1")[obraId] ?? { obraId, parecerAcesso: "Pendente" };
}
