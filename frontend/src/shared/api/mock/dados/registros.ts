import { armazenamentoCenario } from "../core/estadoCenario";
import { lerDadosCenario } from "../core/estadoCenario";
// ─── HISTÓRICO E COMENTÁRIOS (RF-11/12) ───
export interface HistoricoObra {
  tipoAcao?: string;
  id: number;
  obraId: number;
  statusAnterior: string | null;
  statusNovo: string | null;
  dataAlteracao: string;
  observacao?: string;
  usuario: { id: number; nome: string };
}

export interface ComentarioObra {
  tipo?: "Cartao" | "Manutencao" | "Timeline";
  id: number;
  obraId: number;
  descricao: string;
  dataRegistro: string;
  usuario: { id: number; nome: string };
}

const STORAGE_KEY_HIST = "mock_historico";

const STORAGE_KEY_COM = "mock_comentarios";

export function obterHistoricoArmazenado(): HistoricoObra[] { return lerDadosCenario<HistoricoObra[]>("mock_historico"); }

export function adicionarHistoricoArmazenado(obraId: number, statusAnterior: string | null, statusNovo: string | null, observacao?: string, usuario?: { id: number; nome: string }, tipoAcao = "MudancaStatus"): HistoricoObra {
  const historico = obterHistoricoArmazenado();
  const novoId = historico.reduce((acc, curr) => Math.max(acc, curr.id), 9000) + 1;
  const novo: HistoricoObra = {
    tipoAcao,
    id: novoId,
    obraId,
    statusAnterior,
    statusNovo,
    dataAlteracao: new Date().toISOString(),
    observacao,
    usuario: usuario || { id: 0, nome: "Sistema" },
  };
  armazenamentoCenario.setItem(STORAGE_KEY_HIST, JSON.stringify([novo, ...historico]));
  return novo;
}

export function obterComentariosArmazenados(): ComentarioObra[] { return lerDadosCenario<ComentarioObra[]>("mock_comentarios"); }

export function adicionarComentarioArmazenado(obraId: number, descricao: string, usuario: { id: number; nome: string }, tipo: NonNullable<ComentarioObra["tipo"]> = "Cartao"): ComentarioObra {
  const comentarios = obterComentariosArmazenados();
  const novoId = comentarios.reduce((acc, curr) => Math.max(acc, curr.id), 700) + 1;
  const novo: ComentarioObra = {
    tipo,
    id: novoId,
    obraId,
    descricao,
    dataRegistro: new Date().toISOString(),
    usuario,
  };
  armazenamentoCenario.setItem(STORAGE_KEY_COM, JSON.stringify([novo, ...comentarios]));
  return novo;
}

export function editarComentarioArmazenado(id: number, descricao: string): ComentarioObra | undefined {
  const comentarios = obterComentariosArmazenados();
  const comentario = comentarios.find(c => c.id === id);
  if (!comentario) return;
  comentario.descricao = descricao;
  armazenamentoCenario.setItem(STORAGE_KEY_COM, JSON.stringify(comentarios));
  return comentario;
}

export function excluirComentarioArmazenado(id: number): boolean {
  const comentarios = obterComentariosArmazenados();
  if (!comentarios.some(c => c.id === id)) return false;
  armazenamentoCenario.setItem(STORAGE_KEY_COM, JSON.stringify(comentarios.filter(c => c.id !== id)));
  return true;
}
