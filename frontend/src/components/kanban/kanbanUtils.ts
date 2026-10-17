import type { StatusObra } from "@/constants/kanbanStatus";

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
      return { texto: `${Math.abs(diffDias)}d atrasado`, urgente: true };
    }
    if (diffDias === 0) {
      return { texto: "Hoje", urgente: true };
    }
    return { texto: `restam ${diffDias}d`, urgente: false };
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

/**
 * Retorna o valor financeiro da obra. Caso valorTotal não esteja definido ou seja <= 0,
 * calcula a estimativa padrão de R$ 1.300 por painel solar fotovoltaico.
 */
export function obterValorObra(card: {
  valorTotal?: number | null;
  quantidadePaineis: number;
}): number {
  if (card.valorTotal && card.valorTotal > 0) {
    return card.valorTotal;
  }
  return (card.quantidadePaineis || 0) * 1300;
}
