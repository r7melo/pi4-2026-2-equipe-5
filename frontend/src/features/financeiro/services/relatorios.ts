import { MOCK_ATIVO } from '@/shared/lib/modoApi';
import { validarAssinaturaArquivo } from '@/shared/lib/arquivoBlob';
import { normalizarErroExportacao } from '../lib/erroExportacao';
import type { FiltrosRelatorioDemonstracao } from "@/shared/types/demonstracao";
import { api } from "@/shared/api/api";
import type { DREObra } from "@/shared/types/dre";
import type {
  CustosObra,
  AtualizarCustosPayload,
  RelatorioCusto,
  RelatorioPublicoDados,
} from "../types/relatorios";


/** GET /api/obras/{obraId}/dre — Rota #34 (RF-20) */
export async function buscarDreObra(obraId: number): Promise<DREObra> {
  const { data } = await api.get<DREObra>(`/obras/${obraId}/dre`);
  return data;
}

/** GET /api/obras/{obraId}/relatorio-custo — Rota #33 (RF-14) */
export async function buscarRelatorioCustoObra(obraId: number): Promise<RelatorioCusto> {
  const { data } = await api.get<RelatorioCusto>(`/obras/${obraId}/relatorio-custo`);
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
      const formatoEsperado = formato === 'pdf' ? 'pdf' : 'xlsx';
      if (!(await validarAssinaturaArquivo(data, formatoEsperado)))
        throw new Error('Resposta de exportação inválida. Tente novamente.');
    }
    return data;
  } catch (erro) {
    throw MOCK_ATIVO ? await normalizarErroExportacao(erro) : erro;
  }
}

/** GET /api/cronograma/compartilhado/{token} — RF-16 */
export async function buscarRelatorioPublico(token: string): Promise<RelatorioPublicoDados> {
  const { data } = await api.get<RelatorioPublicoDados>(`/cronograma/compartilhado/${token}`);
  return data;
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
