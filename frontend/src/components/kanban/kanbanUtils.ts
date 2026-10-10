import type { StatusObra } from "@/constants/kanbanStatus";

export function getCategoriaBadgeStyle(categoria: string) {
  switch (categoria.toLowerCase()) {
    case "residencial":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "comercial":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "industrial":
      return "bg-slate-100 text-slate-700 border-slate-300";
    case "rural":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "manutenção":
    case "manutencao":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
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
