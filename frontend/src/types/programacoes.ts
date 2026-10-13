// Tipos do domínio de Programações e Agendamento no Cronograma (RF-08, RF-09)
export interface Programacao {
  id: number;
  obraId: number;
  equipeId: number;
  dataInicio: string; // ISO (yyyy-MM-dd)
  dataFim: string;    // ISO (yyyy-MM-dd)
  prioridade: number;
  duracaoEstimadaDias?: number;
}

/** Item afetado pela propagação em cadeia (RF-09) */
export interface ProgramacaoAfetada {
  id: number;
  novaDataInicio: string;
  novaDataFim: string;
}

/** Resposta do PUT /api/programacoes/{id}/reordenar — Contrato Rota #16 */
export interface ReordenarProgramacaoResposta {
  id: number;
  novaDataInicio: string;
  novaDataFim: string;
  programacoesAfetadas: ProgramacaoAfetada[];
}

/** Payload para alocar equipe a uma obra (Contrato Rota #15 / RF-08) */
export interface CriarProgramacaoPayload {
  obraId: number;
  equipeId: number;
  dataInicio: string; // ISO (yyyy-MM-dd)
  dataFim?: string;    // ISO exclusiva (yyyy-MM-dd) — opcional; se omitida, calcula por ~9 painéis/dia
  prioridade?: number;
}
