import { MOCK_ATIVO } from '@/shared/lib/modoApi';
import { normalizarErroExportacao } from '../lib/erroExportacao';
import type { FiltrosRelatorioDemonstracao } from "@/shared/types/demonstracao";
import { api } from "@/shared/api/api";
import type { RelatorioCusto, DREObra, CustosObra, AtualizarCustosPayload } from "@/types";

/** GET /api/obras/{obraId}/relatorio-custo — Rota #33 */
export async function buscarRelatorioCusto(obraId: number): Promise<RelatorioCusto> {
  const { data } = await api.get<RelatorioCusto>(`/obras/${obraId}/relatorio-custo`);
  return data;
}

/** GET /api/obras/{obraId}/dre — Rota #34 (RF-20) */
export async function buscarDreObra(obraId: number): Promise<DREObra> {
  const { data } = await api.get<DREObra>(`/obras/${obraId}/dre`);
  return data;
}

/** GET /api/obras/{obraId}/custos — Rota #31 (RF-14) */
export async function buscarCustosObra(obraId: number): Promise<CustosObra> {
  const { data } = await api.get<CustosObra>(`/obras/${obraId}/custos`);
  return data;
}

/** POST /api/obras/{obraId}/custos — Rota #32 (RF-14, RN-03) */
export async function atualizarCustosObra(obraId: number, payload: AtualizarCustosPayload): Promise<CustosObra> {
  const { data } = await api.post<CustosObra>(`/obras/${obraId}/custos`, payload);
  return data;
}

/** GET /api/relatorios/export?formato=pdf|xlsx — Rota #35 (RF-15) */
export async function exportarRelatorio(formato: "pdf" | "excel", filtros?: FiltrosRelatorioDemonstracao, sessao?: number): Promise<Blob> {
  try {
    const { data } = await api.get<Blob>('/relatorios/export', {
      params: { formato, ...filtros }, responseType: 'blob',
      ...(MOCK_ATIVO ? { sessao403: sessao, politica401: 'sessao' as const } : {}),
    });
    if (MOCK_ATIVO) {
      const tipo = formato === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      if (!(data instanceof Blob) || data.size === 0 || data.type !== tipo)
        throw new Error('Resposta de exportação inválida. Tente novamente.');
      const inicio = new Uint8Array(await data.slice(0, 5).arrayBuffer());
      if (formato === 'pdf' ? String.fromCharCode(...inicio) !== '%PDF-' : inicio[0] !== 80 || inicio[1] !== 75 || inicio[2] !== 3 || inicio[3] !== 4)
        throw new Error('Resposta de exportação inválida. Tente novamente.');
    }
    return data;
  } catch (erro) {
    throw MOCK_ATIVO ? await normalizarErroExportacao(erro) : erro;
  }
}

/** Gera token de compartilhamento para visualização pública do relatório de obras */
export async function gerarLinkRelatorioDemonstracao(
  filtros: FiltrosRelatorioDemonstracao,
  sessao?: number
): Promise<string> {
  if (MOCK_ATIVO) {
    const { data } = await api.post<{ token: string }>("/mock/relatorios/compartilhado", filtros, {
      ...(sessao ? { sessao403: sessao } : {}),
    });
    return data.token;
  }
  const { data } = await api.post<{ token: string }>("/cronograma/compartilhado", {
    dataInicio: filtros.periodoInicio,
    dataFim: filtros.periodoFim,
  }, {
    ...(sessao ? { sessao403: sessao } : {}),
  });
  return data.token;
}

// Retrocompatibilidade e alias canônico
export const gerarLinkCompartilhadoRelatorio = (
  periodo: { dataInicio: string; dataFim: string; clienteFiltro?: string },
  sessao?: number
) =>
  gerarLinkRelatorioDemonstracao(
    {
      periodoInicio: periodo.dataInicio,
      periodoFim: periodo.dataFim,
      clienteFiltro: periodo.clienteFiltro ?? "todos",
    },
    sessao
  );
