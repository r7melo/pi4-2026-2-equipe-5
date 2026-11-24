import type { ComentarioObra, HistoricoObra } from "../types/obras";

export interface DescricaoEventoHistorico {
  titulo: string;
  destaque?: string;
}

export type ItemTimelineObra =
  | {
      tipo: "comentario";
      id: string;
      timestamp: number;
      comentario: ComentarioObra;
    }
  | {
      tipo: "historico";
      id: string;
      timestamp: number;
      historico: HistoricoObra;
    };

function converterTimestamp(iso?: string | null): number {
  if (!iso) return 0;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
}

export function descreverEventoHistorico(
  h: HistoricoObra & { tipoAcao?: string }
): DescricaoEventoHistorico {
  if (h.tipoAcao === "ManutencaoConcluida") {
    return { titulo: "Manutenção concluída em campo" };
  }
  if (h.tipoAcao === "Comentario") {
    return { titulo: "Comentário registrado na linha do tempo" };
  }
  if (h.tipoAcao === "Cadastro" || h.tipoAcao === "CadastroObra") {
    return { titulo: "Obra cadastrada no sistema" };
  }
  if (h.tipoAcao === "EdicaoObra") {
    return { titulo: "Dados cadastrais da obra atualizados" };
  }
  if (h.tipoAcao === "AlteracaoFinanceira") {
    return { titulo: "Lançamento financeiro atualizado" };
  }
  if (h.statusNovo) {
    return {
      titulo: `Status alterado de ${h.statusAnterior || "Início"} para`,
      destaque: h.statusNovo,
    };
  }
  return { titulo: "Atualização registrada na obra" };
}

export function montarTimelineCronologica(
  comentarios?: ComentarioObra[],
  historico?: HistoricoObra[]
): ItemTimelineObra[] {
  const itensComentarios: ItemTimelineObra[] = (comentarios ?? []).map((comentario) => ({
    tipo: "comentario",
    id: `c-${comentario.id}`,
    timestamp: converterTimestamp(comentario.dataRegistro),
    comentario,
  }));

  const itensHistorico: ItemTimelineObra[] = (historico ?? []).map((item) => ({
    tipo: "historico",
    id: `h-${item.id}`,
    timestamp: converterTimestamp(item.dataAlteracao),
    historico: item,
  }));

  return [...itensHistorico, ...itensComentarios].sort((a, b) => a.timestamp - b.timestamp);
}
