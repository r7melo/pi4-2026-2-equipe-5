import { armazenamentoCenario } from "../core/estadoCenario";
import { lerDadosCenario } from "../core/estadoCenario";
// ─── HISTÓRICO E COMENTÁRIOS (RF-11/12) ───
export interface HistoricoObra {
  id: number;
  obraId: number;
  statusAnterior: string;
  statusNovo: string;
  dataAlteracao: string;
  observacao?: string;
  usuario: { id: number; nome: string };
}

export interface ComentarioObra {
  id: number;
  obraId: number;
  descricao: string;
  dataRegistro: string;
  usuario: { id: number; nome: string };
}

const STORAGE_KEY_HIST = "mock_historico";

const STORAGE_KEY_COM = "mock_comentarios";

export function obterHistoricoArmazenado(): HistoricoObra[] { return lerDadosCenario<HistoricoObra[]>("mock_historico"); }

export function adicionarHistoricoArmazenado(obraId: number, statusAnterior: string, statusNovo: string, observacao?: string, usuario?: { id: number; nome: string }): HistoricoObra {
  const historico = obterHistoricoArmazenado();
  const novoId = historico.reduce((acc, curr) => Math.max(acc, curr.id), 9000) + 1;
  const novo: HistoricoObra = {
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

export function adicionarComentarioArmazenado(obraId: number, descricao: string, usuario: { id: number; nome: string }): ComentarioObra {
  const comentarios = obterComentariosArmazenados();
  const novoId = comentarios.reduce((acc, curr) => Math.max(acc, curr.id), 700) + 1;
  const novo: ComentarioObra = {
    id: novoId,
    obraId,
    descricao,
    dataRegistro: new Date().toISOString(),
    usuario,
  };
  armazenamentoCenario.setItem(STORAGE_KEY_COM, JSON.stringify([novo, ...comentarios]));
  return novo;
}
