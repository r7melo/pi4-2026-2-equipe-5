import { MOCK_ATIVO } from '@/shared/lib/modoApi';
import { normalizarErroExportacao } from '../lib/erroExportacao';
import type { FiltrosRelatorioDemonstracao } from "@/shared/types/demonstracao";
import { api } from "@/shared/api/api";
import type { RelatorioCusto } from "@/types";

/** GET /api/obras/{obraId}/relatorio-custo */
export async function buscarRelatorioCusto(obraId: number): Promise<RelatorioCusto> {
  const { data } = await api.get<RelatorioCusto>(`/obras/${obraId}/relatorio-custo`);
  return data;
}

/** GET /api/relatorios/export?formato=pdf|xlsx */
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

/** Extensao interna: consumidor habilitado somente quando o mock esta ativo. */
export async function gerarLinkRelatorioDemonstracao(filtros: FiltrosRelatorioDemonstracao): Promise<string> {
  const { data } = await api.post<{ token: string }>("/mock/relatorios/compartilhado", filtros);
  return data.token;
}
