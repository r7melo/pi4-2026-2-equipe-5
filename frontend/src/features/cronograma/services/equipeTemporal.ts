import { api } from '@/shared/api/api';
import { equipeTemporalSchema, disponibilidadeSchema, ocupacaoSchema } from '@/shared/lib/equipeTemporal';
import type { AlteracaoEquipeTemporal } from '@/shared/types/equipeTemporal';

export async function consultarDisponibilidade(inicio: string, fim: string, sessao403: number, signal?: AbortSignal) {
  const { data } = await api.get<unknown>('/instaladores/disponibilidade', {
    params: { dataInicio: inicio, dataFim: fim }, sessao403, signal, politica401: 'sessao',
  });
  return disponibilidadeSchema.parse(data);
}
export async function consultarOcupacao(inicio: string, fim: string, sessao403: number, signal?: AbortSignal) {
  const { data } = await api.get<unknown>('/gantt/ocupacao', {
    params: { dataInicio: inicio, dataFim: fim }, sessao403, signal, politica401: 'sessao',
  });
  return ocupacaoSchema.parse(data);
}
export async function alterarEquipeTemporal(id: number, alteracao: AlteracaoEquipeTemporal, sessao403: number) {
  const config = { sessao403, politica401: 'sessao' as const };
  const base = `/programacoes/${id}`;
  let data: unknown;
  switch (alteracao.tipo) {
    case 'previstas':
      ({ data } = await api.patch(`${base}/equipe`, { pessoasPrevistas: alteracao.pessoasPrevistas }, config)); break;
    case 'incluir':
      ({ data } = await api.post(`${base}/integrantes`, { usuarioId: alteracao.usuarioId, dataEntrada: alteracao.dataEntrada, dataSaida: alteracao.dataSaida }, config)); break;
    case 'datas':
      ({ data } = await api.patch(`${base}/integrantes/${alteracao.usuarioId}`, { dataEntrada: alteracao.dataEntrada, dataSaida: alteracao.dataSaida }, config)); break;
    case 'remover':
      ({ data } = await api.delete(`${base}/integrantes/${alteracao.usuarioId}`, { ...config, params: { dataSaida: alteracao.dataSaida } })); break;
  }
  return equipeTemporalSchema.parse(data);
}
