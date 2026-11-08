import type { ObraDetalhe, ObraCard, Material, Programacao, DadosHomologacao, RelatorioCusto } from "@/types";
import { lerDadosCenario, salvarDadosCenario } from "../core/estadoCenario";
import { obterObrasArmazenadas, salvarObrasArmazenadas } from "./obras";
export function excluirObraArmazenada(id: number): boolean {
  const obra = obterObrasArmazenadas().find(o => o.id === id);
  if (!obra) return false;
  const detalhes = lerDadosCenario<Record<number, ObraDetalhe>>("mock_detalhes_v1");
  const excluidas = lerDadosCenario<Record<number, { obra: ObraCard; detalhe: ObraDetalhe; excluidaEm: string }>>("mock_excluidas_v1");
  excluidas[id] = { obra, detalhe: detalhes[id], excluidaEm: new Date().toISOString() };
  salvarDadosCenario("mock_excluidas_v1", excluidas);
  delete detalhes[id]; salvarDadosCenario("mock_detalhes_v1", detalhes);
  salvarObrasArmazenadas(obterObrasArmazenadas().filter(o => o.id !== id));
  salvarDadosCenario("mock_materiais", lerDadosCenario<Material[]>("mock_materiais").filter(m => m.obraId !== id));
  salvarDadosCenario("mock_programacoes_v4", lerDadosCenario<Programacao[]>("mock_programacoes_v4").filter(p => p.obraId !== id));
  const homologacoes = lerDadosCenario<Record<number, DadosHomologacao>>("mock_homologacoes_v1");
  delete homologacoes[id]; salvarDadosCenario("mock_homologacoes_v1", homologacoes);
  const relatorios = lerDadosCenario<Record<number, RelatorioCusto>>("mock_relatorios_v1");
  delete relatorios[id]; salvarDadosCenario("mock_relatorios_v1", relatorios);
  // Historico e comentarios permanecem vinculados ao tombstone, fora das publicacoes ativas.
  return true;
}
