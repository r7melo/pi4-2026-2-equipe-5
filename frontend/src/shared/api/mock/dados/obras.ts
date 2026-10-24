import type { ObraCard } from "@/types";
import type { StatusObra } from "@/shared/constants/kanbanStatus";

/** 10 Obras sincronizadas estritamente com database/02_seed.sql */
export const MOCK_OBRAS_FIXTURE: ObraCard[] = [
  { id: 301, clienteNome: "Rede Alfa Supermercados", status: "MaterialComprado", categoria: "Comercial", quantidadePaineis: 45, dataFimEstimada: "2026-10-06", valorTotal: 58500, prazoContratualDias: 45, atualizadoPor: "Carlos Admin" },
  { id: 302, clienteNome: "Indústria Metalúrgica Ramos", status: "MaterialComprado", categoria: "Industrial", quantidadePaineis: 120, dataFimEstimada: "2026-10-25", valorTotal: 156000, prazoContratualDias: 60, atualizadoPor: "Carlos Admin" },
  { id: 303, clienteNome: "Residencial Vista Verde", status: "NoDeposito", categoria: "Residencial", quantidadePaineis: 24, dataFimEstimada: "2026-10-14", valorTotal: 32000, prazoContratualDias: 30, atualizadoPor: "Ana Souza" },
  { id: 304, clienteNome: "Fazenda Santa Maria", status: "Separado", categoria: "Rural", quantidadePaineis: 80, dataFimEstimada: "2026-10-08", valorTotal: 104000, prazoContratualDias: 45, atualizadoPor: "Ana Souza" },
  { id: 305, clienteNome: "Hospital São Lucas", status: "EmAndamento", categoria: "Comercial", quantidadePaineis: 96, dataFimEstimada: "2026-10-02", valorTotal: 128000, prazoContratualDias: 30, atualizadoPor: "Ana Souza" },
  { id: 306, clienteNome: "Condomínio Solar das Flores", status: "EmAndamento", categoria: "Residencial", quantidadePaineis: 36, dataFimEstimada: "2026-10-04", valorTotal: 48000, prazoContratualDias: 30, atualizadoPor: "Julia Eng." },
  { id: 307, clienteNome: "Posto Alvorada Combustíveis", status: "Concluido", categoria: "Comercial", quantidadePaineis: 50, dataFimEstimada: "2026-09-18", valorTotal: 69000, prazoContratualDias: 45, atualizadoPor: "Ana Souza" },
  { id: 308, clienteNome: "Granja Silva", status: "Assistencia", categoria: "Manutenção", quantidadePaineis: 30, dataFimEstimada: "2026-10-12", valorTotal: 18000, prazoContratualDias: 15, atualizadoPor: "Marcos Instalador" },
  { id: 309, clienteNome: "Escola Estadual Dom Pedro II", status: "NoDeposito", categoria: "Comercial", quantidadePaineis: 60, dataFimEstimada: "2026-10-20", valorTotal: 78000, prazoContratualDias: 45, atualizadoPor: "Ana Souza" },
  { id: 310, clienteNome: "Shopping Bela Vista", status: "MaterialComprado", categoria: "Comercial", quantidadePaineis: 200, dataFimEstimada: "2026-11-10", valorTotal: 260000, prazoContratualDias: 90, atualizadoPor: "Carlos Admin" },
];

const STORAGE_KEY = "mock_obras_v3";

export function obterObrasArmazenadas(): ObraCard[] {
  if (typeof window === "undefined") return MOCK_OBRAS_FIXTURE;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("[Mock] Erro ao ler sessionStorage:", e);
  }
  salvarObrasArmazenadas(MOCK_OBRAS_FIXTURE);
  return MOCK_OBRAS_FIXTURE;
}

export function salvarObrasArmazenadas(obras: ObraCard[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(obras));
  } catch (e) {
    console.warn("[Mock] Erro ao salvar sessionStorage:", e);
  }
}

export function adicionarObraArmazenada(payload: {
  clienteNome: string;
  cidade?: string;
  quantidadePaineis: number;
  dataInicioEstimada: string;
  dataFimEstimada: string;
}): ObraCard {
  const obras = obterObrasArmazenadas();
  const maxId = obras.reduce((acc, curr) => Math.max(acc, Number(curr.id) || 0), 300);
  const novoId = maxId + 1;

  const novaObra: ObraCard = {
    id: novoId,
    clienteNome: payload.clienteNome,
    cidade: payload.cidade,
    status: "MaterialComprado",
    categoria: "Residencial",
    quantidadePaineis: payload.quantidadePaineis,
    dataFimEstimada: payload.dataFimEstimada,
    valorTotal: payload.quantidadePaineis * 1300,
    prazoContratualDias: 30,
    atualizadoPor: "Ana Souza",
  };

  const listaAtualizada = [novaObra, ...obras];
  salvarObrasArmazenadas(listaAtualizada);
  return novaObra;
}

export function atualizarStatusObraArmazenada(
  id: number,
  statusNovo: StatusObra,
  autorAtualizacao?: string
): ObraCard | null {
  const obras = obterObrasArmazenadas();
  let obraModificada: ObraCard | null = null;

  const listaAtualizada = obras.map((obra) => {
    if (Number(obra.id) === id) {
      obraModificada = {
        ...obra,
        status: statusNovo,
        atualizadoPor: autorAtualizacao || obra.atualizadoPor || "Ana Souza",
      };
      return obraModificada;
    }
    return obra;
  });

  if (obraModificada) {
    salvarObrasArmazenadas(listaAtualizada);
  }

  return obraModificada;
}
