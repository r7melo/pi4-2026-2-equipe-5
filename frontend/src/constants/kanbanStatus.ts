export const COLUNAS_KANBAN = [
  { id: "MaterialComprado", label: "Material Comprado" },
  { id: "NoDeposito", label: "No Depósito" },
  { id: "Separado", label: "Separado p/ Obra" },
  { id: "EmAndamento", label: "Em Andamento" },
  { id: "Concluido", label: "Concluído" },
  { id: "Assistencia", label: "Assistência / Manutenção" },
] as const;

export type StatusObra = typeof COLUNAS_KANBAN[number]["id"];

// Ordem de transição válida (RF-04)
export const TRANSICOES_VALIDAS: Record<StatusObra, StatusObra[]> = {
  MaterialComprado: ["NoDeposito", "Assistencia"],
  NoDeposito: ["Separado", "Assistencia"],
  Separado: ["EmAndamento", "Assistencia"],
  EmAndamento: ["Concluido", "Assistencia"],
  Concluido: ["Assistencia"],
  Assistencia: ["Concluido", "EmAndamento", "Separado", "NoDeposito", "MaterialComprado"],
};
