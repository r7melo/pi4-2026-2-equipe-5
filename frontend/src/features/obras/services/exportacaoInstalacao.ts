import { api } from "@/shared/api/api";
import type { DadosInstalacao, FormatoExportacaoInstalacao } from "@/types";
import { obraInstalacaoSchema, materiaisInstalacaoSchema, programacoesInstalacaoSchema, equipesInstalacaoSchema } from "../types/exportacaoInstalacao";
import { normalizarTextoInstalacao } from "@/shared/lib/instalacao";

function validarId(obraId: number): void {
  if (!Number.isSafeInteger(obraId) || obraId <= 0) throw new Error("Obra inválida");
}

export async function consultarDadosInstalacao(obraId: number, signal?: AbortSignal): Promise<DadosInstalacao> {
  validarId(obraId);
  const ctrl = new AbortController();
  const abortar = () => ctrl.abort();
  if (signal?.aborted) ctrl.abort();
  signal?.addEventListener("abort", abortar, { once: true });
  try {
    // Validar cada fonte ainda dentro da promessa: falha estrutural também cancela as irmãs.
    const [obra, materiais, programacoes, equipes] = await Promise.all([
      api.get<unknown>(`/obras/${obraId}`, { signal: ctrl.signal }).then((r) => {
        const dado = obraInstalacaoSchema.parse(r.data);
        if (dado.id !== obraId) throw new Error("Identidade da obra divergente");
        return dado;
      }),
      api.get<unknown>(`/obras/${obraId}/materiais`, { signal: ctrl.signal }).then((r) => {
        const dados = materiaisInstalacaoSchema.parse(r.data);
        if (dados.some((m) => m.obraId !== undefined && m.obraId !== obraId)) throw new Error("Material de outra obra");
        return dados;
      }),
      api.get<unknown>("/programacoes", { signal: ctrl.signal }).then((r) => programacoesInstalacaoSchema.parse(r.data)),
      api.get<unknown>("/equipes", { signal: ctrl.signal }).then((r) => equipesInstalacaoSchema.parse(r.data)),
    ]);
    const nomes = new Map(equipes.map((e) => [e.id, normalizarTextoInstalacao(e.nome)]));
    return {
      obraId: obra.id, tituloObra: `Obra #${obra.id} - ${obra.cliente.nome}`, clienteNome: obra.cliente.nome,
      endereco: normalizarTextoInstalacao(obra.endereco), observacoesTecnicas: normalizarTextoInstalacao(obra.descricao),
      materiais: materiais.map((m) => ({ id: m.id,
        nome: normalizarTextoInstalacao(m.nome) ?? normalizarTextoInstalacao(m.descricao) ?? normalizarTextoInstalacao(m.tipo),
        quantidade: m.quantidade ?? null, unidade: normalizarTextoInstalacao(m.unidade),
      })),
      programacoes: programacoes.filter((p) => p.obraId === obraId).map((p) => ({
        id: p.id, equipeId: p.equipeId ?? null, nomeEquipe: p.equipeId ? nomes.get(p.equipeId) ?? null : null,
        dataInicio: normalizarTextoInstalacao(p.dataInicio), dataFim: normalizarTextoInstalacao(p.dataFim),
      })),
    };
  } catch (erro: unknown) {
    ctrl.abort();
    throw erro;
  } finally {
    signal?.removeEventListener("abort", abortar);
  }
}

export async function solicitarArquivoInstalacao(obraId: number, formato: FormatoExportacaoInstalacao, signal?: AbortSignal): Promise<Blob> {
  validarId(obraId);
  if (formato !== "pdf" && formato !== "xlsx") throw new Error("Formato inválido");
  const { data } = await api.get<Blob>(`/obras/${obraId}/instalacao/export`, {
    params: { formato }, responseType: "blob", signal,
  });
  return data;
}
