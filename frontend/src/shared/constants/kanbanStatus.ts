export const COLUNAS_KANBAN = [
  { id: "MaterialComprado", label: "Material Comprado", badge: null },
  { id: "NoDeposito", label: "No Depósito", badge: null },
  { id: "Separado", label: "Separado p/ Obra", badge: null },
  { id: "EmAndamento", label: "Em Andamento", badge: null },
  { id: "Concluido", label: "Concluído", badge: null },
  { id: "Assistencia", label: "Assistência Técnica", badge: "Manutenção" },
] as const;

export type StatusObra = typeof COLUNAS_KANBAN[number]["id"];

/**
 * Ordem estrita de transição canônica do Funil ZL Engenharia (04-regras-negocio.md / RF-04)
 * - MaterialComprado -> NoDeposito -> Separado -> EmAndamento -> Concluido
 * - EmAndamento -> Assistencia
 * - Concluido -> Assistencia
 * - Assistencia -> EmAndamento
 */
export const TRANSICOES_VALIDAS: Record<StatusObra, StatusObra[]> = {
  MaterialComprado: ["NoDeposito"],
  NoDeposito: ["Separado"],
  Separado: ["EmAndamento"],
  EmAndamento: ["Concluido", "Assistencia"],
  Concluido: ["Assistencia"],
  Assistencia: ["EmAndamento"],
};
