// Contratos neutros do domínio de Programações e Agendamento no Cronograma (RF-08, RF-09)

/** Programação de alocação de equipe em obra — Contrato canônico Rota #28 (GET /api/programacoes) */
export interface Programacao {
  id: number;
  obraId: number;
  equipeId: number;
  dataInicio: string; // ISO (yyyy-MM-dd)
  dataFim: string;    // ISO inclusiva (yyyy-MM-dd) — último dia útil trabalhado
  prioridade: number;
  duracaoEstimadaDias?: number | null;
}

/** Item afetado pela propagação em cadeia (RF-09) — Rota #30 canônica */
export interface ProgramacaoAfetada {
  id: number;
  novaDataInicio: string;
  novaDataFim: string;
}

/** Resposta do reagendamento com propagação — Contrato canônico Rota #30 (PUT /api/programacoes/{id}/reordenar) */
export interface ReordenarProgramacaoResposta {
  id: number;
  novaDataInicio: string;
  novaDataFim: string;
  programacoesAfetadas: ProgramacaoAfetada[];
}

/** Payload para reagendar alocação — Contrato canônico Rota #30 (PUT /api/programacoes/{id}/reordenar) */
export interface ReordenarProgramacaoPayload {
  novaDataInicio: string;
}

/** Payload para alocar equipe a uma obra — Contrato canônico Rota #29 (POST /api/programacoes) */
export interface CriarProgramacaoPayload {
  obraId: number;
  equipeId: number;
  dataInicio: string; // ISO (yyyy-MM-dd)
  dataFim?: string;    // ISO inclusiva (yyyy-MM-dd) — extensão mock para paridade de testes
  prioridade?: number;
}
