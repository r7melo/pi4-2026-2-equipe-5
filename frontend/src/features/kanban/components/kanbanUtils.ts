import type { StatusObra } from "@/shared/constants/kanbanStatus";
import type { Material, StatusLogistico } from "@/shared/types/materiais";
import type { ObraKanbanCard } from "../types/kanban";

export function agruparObrasPorStatus(
  obras: ObraKanbanCard[]
): Record<StatusObra, ObraKanbanCard[]> {
  const mapa: Record<StatusObra, ObraKanbanCard[]> = {
    MaterialComprado: [],
    NoDeposito: [],
    Separado: [],
    EmAndamento: [],
    Concluido: [],
    Assistencia: [],
  };
  for (const obra of obras) {
    if (mapa[obra.status]) {
      mapa[obra.status].push(obra);
    }
  }
  return mapa;
}

export function ordenarObrasPorPrazo(obras: ObraKanbanCard[]): ObraKanbanCard[] {
  return [...obras].sort((a, b) => {
    const timeA = a.dataFimEstimada ? new Date(a.dataFimEstimada).getTime() : Infinity;
    const timeB = b.dataFimEstimada ? new Date(b.dataFimEstimada).getTime() : Infinity;
    return timeA - timeB;
  });
}

export function selecionarVisaoIntegral(obras: ObraKanbanCard[]): ObraKanbanCard[] {
  return ordenarObrasPorPrazo(
    obras.filter(
      (obra) =>
        obra.status !== "Concluido" ||
        !isObraConcluidaArquivada(obra.dataFimReal || obra.dataFimEstimada)
    )
  );
}

export interface FiltrosKanbanBoard {
  busca: string;
  categoriaFiltro: string;
  materialFiltro: string;
  mapaMateriais: Map<number, Material[]>;
  exibirArquivadas: boolean;
  somenteLeitura: boolean;
}

function correspondeFiltroMaterial(
  materialFiltro: string,
  statusGargalo?: StatusLogistico
): boolean {
  if (materialFiltro === "Em Solicitação") return statusGargalo === "EmSolicitacao";
  if (materialFiltro === "Comprado") return statusGargalo === "Comprado";
  if (materialFiltro === "Em Trânsito") return statusGargalo === "EmTransito";
  if (materialFiltro === "Disponível" || materialFiltro === "No Depósito") {
    return statusGargalo === "Disponivel";
  }
  if (materialFiltro === "Utilizado" || materialFiltro === "Separado") {
    return statusGargalo === "Utilizado";
  }
  return true;
}

export function filtrarOrdenarObrasKanban(
  obras: ObraKanbanCard[],
  filtros: FiltrosKanbanBoard
): ObraKanbanCard[] {
  if (filtros.somenteLeitura) return selecionarVisaoIntegral(obras);

  const termo = filtros.busca.trim().toLowerCase();
  const list = obras.filter((obra) => {
    if (termo) {
      const matchCliente = obra.clienteNome.toLowerCase().includes(termo);
      const matchId = String(obra.id).includes(termo);
      if (!matchCliente && !matchId) return false;
    }

    if (filtros.categoriaFiltro && obra.categoria !== filtros.categoriaFiltro) {
      return false;
    }

    if (filtros.materialFiltro && filtros.materialFiltro !== "Todos") {
      const mats = filtros.mapaMateriais.get(Number(obra.id));
      if (!mats) return false;
      const statusGargalo = calcularStatusGargalo(mats, obra.status);
      if (!correspondeFiltroMaterial(filtros.materialFiltro, statusGargalo)) return false;
    }

    if (obra.status === "Concluido" && !termo && !filtros.exibirArquivadas) {
      if (isObraConcluidaArquivada(obra.dataFimReal || obra.dataFimEstimada)) {
        return false;
      }
    }

    return true;
  });

  return ordenarObrasPorPrazo(list);
}

export function getCategoriaBadgeStyle(categoria: string) {
  switch (categoria.toLowerCase()) {
    case "residencial":
      return "bg-info-light text-info border-info-border";
    case "comercial":
      return "bg-accent-light text-accent border-accent-border";
    case "industrial":
      return "bg-muted text-foreground-muted border-border-strong";
    case "rural":
      return "bg-success-light text-success border-success-border";
    case "manutenção":
    case "manutencao":
      return "bg-warning-light text-warning border-warning-border";
    default:
      return "bg-muted text-foreground-muted border-border-subtle";
  }
}

export function getIniciaisNome(nome?: string): string {
  if (!nome) return "ZL";
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export interface PrazoCardInfo {
  texto: string;
  urgente: boolean;
  concluido?: boolean;
}

export function calcularDiasRestantes(dataFimISO: string, status?: StatusObra): PrazoCardInfo {
  if (status === "Concluido") {
    return { texto: "Concluído", urgente: false, concluido: true };
  }

  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const prazo = new Date(dataFimISO);
    prazo.setHours(0, 0, 0, 0);
    const diffDias = Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    if (isNaN(diffDias)) {
      return { texto: "Em dia", urgente: false };
    }
    if (diffDias < 0) {
      return { texto: `${Math.abs(diffDias)}d atraso`, urgente: true };
    }
    if (diffDias === 0) {
      return { texto: "Hoje", urgente: true };
    }
    if (diffDias <= 3) {
      return { texto: `${diffDias}d rest.`, urgente: true };
    }
    return { texto: `${diffDias}d rest.`, urgente: false };
  } catch {
    return { texto: "Em dia", urgente: false };
  }
}

export function obterHojeLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isObraConcluidaArquivada(dataFimISO?: string): boolean {
  if (!dataFimISO) return false;
  const hoje = new Date();
  const diffMs = hoje.getTime() - new Date(dataFimISO).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) > 30;
}

export function calcularStatusGargalo(
  materiaisObra?: Material[],
  statusObra?: StatusObra
): StatusLogistico | undefined {
  if (!materiaisObra || materiaisObra.length === 0) {
    if (statusObra === "MaterialComprado") return "Comprado";
    if (statusObra === "NoDeposito") return "Disponivel";
    return undefined;
  }

  // Precedência de gargalo estrito:
  // 1. Qualquer insumo "EmSolicitacao" indica solicitação pendente de compra
  if (materiaisObra.some((m) => m.statusLogistico === "EmSolicitacao")) return "EmSolicitacao";
  // 2. Qualquer insumo não definido ou "Comprado" indica compra pendente
  if (materiaisObra.some((m) => !m.statusLogistico || m.statusLogistico === "Comprado"))
    return "Comprado";
  // 3. Qualquer insumo em transporte indica deslocamento logístico
  if (materiaisObra.some((m) => m.statusLogistico === "EmTransito")) return "EmTransito";
  // 4. Se todos os insumos forem consumidos na obra
  if (materiaisObra.every((m) => m.statusLogistico === "Utilizado")) return "Utilizado";
  // 5. Se todos os materiais estão no depósito (ou mesclados com utilizados)
  return "Disponivel";
}
