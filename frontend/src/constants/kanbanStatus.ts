export const COLUNAS_KANBAN = [
  { id: "MaterialComprado", label: "Material Comprado" },
  { id: "NoDeposito", label: "No Depósito" },
  { id: "Separado", label: "Separado p/ Obra" },
  { id: "EmAndamento", label: "Em Andamento" },
  { id: "Concluido", label: "Concluído" },
] as const;

export const RAIA_ASSISTENCIA = { id: "Assistencia", label: "Assistência / Manutenção" } as const;

export type StatusObra = typeof COLUNAS_KANBAN[number]["id"] | "Assistencia";

// Ordem de transição válida (RF-04)
export const TRANSICOES_VALIDAS: Record<StatusObra, StatusObra[]> = {
  MaterialComprado: ["NoDeposito"],
  NoDeposito: ["Separado"],
  Separado: ["EmAndamento"],
  EmAndamento: ["Concluido", "Assistencia"],
  Concluido: ["Assistencia"],
  Assistencia: ["EmAndamento"],
};
