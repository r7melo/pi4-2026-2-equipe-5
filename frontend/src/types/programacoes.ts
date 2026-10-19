// Tipos do domínio de Programações e Agendamento no Cronograma (RF-08, RF-09)
export interface Programacao {
  id: number;
  obraId: number;
  equipeId: number;
  dataInicio: string; // ISO (yyyy-MM-dd)
  dataFim: string;    // ISO inclusiva (yyyy-MM-dd) — último dia útil trabalhado
  prioridade: number;
  duracaoEstimadaDias?: number;
}

/** Item afetado pela propagação em cadeia (RF-09) */
export interface ProgramacaoAfetada {
  id: number;
  novaDataInicio: string;
  novaDataFim: string;
}

/** Resposta do PUT /api/programacoes/{id}/reordenar — Contrato Rota #24 */
export interface ReordenarProgramacaoResposta {
  id: number;
  novaDataInicio: string;
  novaDataFim: string;
  programacoesAfetadas: ProgramacaoAfetada[];
}

/** Payload para alocar equipe a uma obra (Contrato Rota #23 / RF-08) */
export interface CriarProgramacaoPayload {
  obraId: number;
  equipeId: number;
  dataInicio: string; // ISO (yyyy-MM-dd)
  dataFim?: string;    // ISO inclusiva (yyyy-MM-dd) — opcional; mantida para paridade de mock
  prioridade?: number;
}

