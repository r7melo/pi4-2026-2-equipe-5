// frontend/src/services/cronogramaPublico.ts
// Rota #21 do Contrato de API — GET /api/cronograma/compartilhado/{token} (RF-16)
import { api } from "./api";
import type { Programacao } from "./programacoes";

export interface FiltroCronogramaPublico {
  dataInicio?: string;
  dataFim?: string;
}

export async function obterCronogramaCompartilhado(
  token: string,
  filtro?: FiltroCronogramaPublico
): Promise<Programacao[]> {
  const { data } = await api.get<Programacao[]>(
    `/cronograma/compartilhado/${encodeURIComponent(token)}`,
    { params: filtro }
  );
  return data;
}
