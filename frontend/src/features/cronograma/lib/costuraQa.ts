import { MOCK_ATIVO } from "@/shared/lib/modoApi";
import { dataCivilValida } from "@/shared/lib/datasCivis";
import type { JanelaDatasGantt } from "./janelaProgramacoes";

/**
 * Interface observacional restrita da costura de QA do Gantt (Demanda #90).
 * Qualquer método invocado sobre uma referência inativa, substituída ou após
 * o desmonte do componente lança Error por invalidação de capacidade.
 */
export interface CosturaQaGantt {
  lerJanela(): JanelaDatasGantt;
  mostrarData(iso: string): void;
  lerTarefa(id: number): { dataInicio: string; dataFim: string } | null;
}

declare global {
  interface Window {
    __qa90?: CosturaQaGantt;
  }
}

let contadorInstalacao = 0;
let donoAtivoId = 0;

/**
 * Registra a costura observacional window.__qa90 estritamente em ambiente de
 * desenvolvimento com mock ativo (import.meta.env.DEV && MOCK_ATIVO).
 * Retorna callback de cleanup seguro para desmonte e React StrictMode.
 */
export function registrarCosturaQa(provedor: CosturaQaGantt): () => void {
  if (!import.meta.env.DEV || !MOCK_ATIVO || typeof window === "undefined" || !provedor) {
    return () => {};
  }

  const meuDonoId = ++contadorInstalacao;
  donoAtivoId = meuDonoId;

  function assegurarAtivo(): void {
    if (donoAtivoId !== meuDonoId || typeof window === "undefined" || window["__qa90"] !== api) {
      throw new Error("Instância da costura QA descartada, substituída ou inativa.");
    }
  }

  const api: CosturaQaGantt = {
    lerJanela(): JanelaDatasGantt {
      assegurarAtivo();
      const janela = provedor.lerJanela();
      return {
        inicio: janela.inicio,
        fim: janela.fim,
      };
    },

    mostrarData(iso: string): void {
      assegurarAtivo();
      if (!dataCivilValida(iso)) {
        throw new RangeError(`Data civil inválida: ${String(iso)}`);
      }
      provedor.mostrarData(iso);
    },

    lerTarefa(id: number): { dataInicio: string; dataFim: string } | null {
      assegurarAtivo();
      if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
        return null;
      }
      const tarefa = provedor.lerTarefa(id);
      if (!tarefa) {
        return null;
      }
      return {
        dataInicio: tarefa.dataInicio,
        dataFim: tarefa.dataFim,
      };
    },
  };

  window["__qa90"] = api;

  return () => {
    if (donoAtivoId === meuDonoId) {
      donoAtivoId = 0;
      if (typeof window !== "undefined" && window["__qa90"] === api) {
        delete window["__qa90"];
      }
    }
  };
}
