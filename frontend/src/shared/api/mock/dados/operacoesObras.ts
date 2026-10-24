import { obterObrasArmazenadas, salvarObrasArmazenadas } from "./obras";
import { obterProgramacoesArmazenadas, STORAGE_KEY_PROG } from "./programacoes";

export function excluirObraArmazenada(id: number): boolean {
  const obras = obterObrasArmazenadas();
  const index = obras.findIndex((o) => Number(o.id) === Number(id));
  if (index === -1) return false;

  obras.splice(index, 1);
  salvarObrasArmazenadas(obras);

  // Defesa em profundidade: purga defensiva de eventuais programações no Gantt
  if (typeof window !== "undefined") {
    try {
      const progs = obterProgramacoesArmazenadas();
      const filtradas = progs.filter((p) => Number(p.obraId) !== Number(id));
      if (filtradas.length !== progs.length) {
        sessionStorage.setItem(STORAGE_KEY_PROG, JSON.stringify(filtradas));
      }
    } catch {
      // Silencia erro no storage
    }
  }

  return true;
}
