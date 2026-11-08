import { armazenamentoCenario, lerDadosCenario } from "../core/estadoCenario";
import type { ObraCard } from "@/types";
import type { StatusObra } from "@/shared/constants/kanbanStatus";

const STORAGE_KEY = "mock_obras_v3";

export function obterObrasArmazenadas(): ObraCard[] { return lerDadosCenario<ObraCard[]>("mock_obras_v3"); }

export function salvarObrasArmazenadas(obras: ObraCard[]): void {
  armazenamentoCenario.setItem(STORAGE_KEY, JSON.stringify(obras));
}

export function atualizarStatusObraArmazenada(
  id: number,
  statusNovo: StatusObra,
  autorAtualizacao?: string
): ObraCard | null {
  const obras = obterObrasArmazenadas();
  let obraModificada: ObraCard | null = null;

  const listaAtualizada = obras.map((obra) => {
    if (Number(obra.id) === id) {
      obraModificada = {
        ...obra,
        status: statusNovo,
        atualizadoPor: autorAtualizacao || obra.atualizadoPor || "Ana Souza",
      };
      return obraModificada;
    }
    return obra;
  });

  if (obraModificada) {
    salvarObrasArmazenadas(listaAtualizada);
  }

  return obraModificada;
}
