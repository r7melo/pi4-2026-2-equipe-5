import type { DadosHomologacao } from "@/types";

/** Fixture de Homologação 100% sincronizada com 02_seed.sql e QA (com Obra 308 Reprovada para testes) */
export const MOCK_HOMOLOGACOES_FIXTURE: Record<number, DadosHomologacao> = {
  301: { obraId: 301, parecerAcesso: "Aprovado", artTrt: "ART-2026-0301", prazoVistoria: "2026-10-10" },
  302: { obraId: 302, parecerAcesso: "Pendente", prazoVistoria: "2026-10-28" },
  303: { obraId: 303, parecerAcesso: "EmAnalise", artTrt: "ART-2026-0303", prazoVistoria: "2026-10-18" },
  304: { obraId: 304, parecerAcesso: "Aprovado", artTrt: "ART-2026-0304", prazoVistoria: "2026-10-12" },
  305: { obraId: 305, parecerAcesso: "Aprovado", artTrt: "ART-2026-0305", prazoVistoria: "2026-10-05" },
  306: { obraId: 306, parecerAcesso: "EmAnalise", artTrt: "ART-2026-0306", prazoVistoria: "2026-10-08" },
  307: { obraId: 307, parecerAcesso: "Aprovado", artTrt: "ART-2026-0307", prazoVistoria: "2026-09-20" },
  308: { obraId: 308, parecerAcesso: "Reprovado" },
  309: { obraId: 309, parecerAcesso: "Pendente", prazoVistoria: "2026-10-25" },
  310: { obraId: 310, parecerAcesso: "Pendente", prazoVistoria: "2026-11-15" },
};

export function obterHomologacaoObraArmazenada(obraId: number): DadosHomologacao {
  return (
    MOCK_HOMOLOGACOES_FIXTURE[Number(obraId)] || {
      obraId: Number(obraId),
      parecerAcesso: "Pendente",
    }
  );
}
