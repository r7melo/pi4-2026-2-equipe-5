import axios from 'axios';
import { ApiErro } from '@/shared/api/api';
import { herdarContexto403 } from '@/shared/lib/sessaoOperacao';

/** Erros blob/JSON são decodificados fora da tela; nunca viram arquivo. */
export async function normalizarErroExportacao(erro: unknown): Promise<Error> {
  if (!axios.isAxiosError(erro)) return erro instanceof Error ? erro : new Error('Erro ao exportar relatório.');
  const status = erro.response?.status ?? 0;
  if (status === 401) return erro;
  if (status === 403) {
    const local = new ApiErro(status, 'ACCESS_DENIED', 'Você não possui permissão para exportar este relatório.');
    herdarContexto403(erro, local); return local;
  }
  let corpo: unknown = erro.response?.data;
  if (corpo instanceof Blob) {
    if (corpo.size > 65536) return erro;
    try { corpo = JSON.parse(await corpo.text()) as unknown; } catch { return erro; }
  }
  if (corpo && typeof corpo === 'object' && 'error' in corpo && corpo.error && typeof corpo.error === 'object') {
    const e = corpo.error;
    if ('code' in e && typeof e.code === 'string' && 'message' in e && typeof e.message === 'string' && e.message.length <= 1000) {
      const local = new ApiErro(status, e.code, e.message); herdarContexto403(erro, local); return local;
    }
  }
  return erro;
}
