import { lerGestao, gravarGestao, equipeGestaoSchema } from "./estadoGestao";
import type { Equipe, CriarEquipePayload } from "@/types";

export interface MockInstalador {
  id: number;
  nome: string;
  email: string;
}

export class InstaladorVinculadoError extends Error {}



export function obterEquipesArmazenadas(): Equipe[] {
  const equipes = lerGestao().equipes;
  if (!equipes) throw new Error("Equipes da demonstração indisponíveis.");
  return equipes;
}
export function salvarEquipesArmazenadas(equipes: Equipe[]): void {
  const gestao = lerGestao();
  gestao.equipes = equipes.map(e => equipeGestaoSchema.parse(e));
  gestao.equipesRevisao = crypto.randomUUID(); gravarGestao(gestao);
}
export function adicionarEquipeArmazenada(payload: CriarEquipePayload, opcoes: MockInstalador[]): Equipe {
  const gestao = lerGestao();
  const equipes = gestao.equipes;
  const ids = new Set(payload.instaladorIds);
  const contas = [...ids].map(id => {
    const conta = gestao.contas[String(id)] ?? gestao.novos.find(u => u.id === id);
    if (!conta || !conta.ativo || conta.perfil !== "InstaladorCampo") {
      throw new Error("Selecione instaladores ativos cadastrados.");
    }
    return conta;
  });
  if (contas.some(conta => conta.equipeId !== null) ||
      equipes.some(e => e.membros?.some(membro => ids.has(membro.id)))) {
    throw new InstaladorVinculadoError("Instalador já pertence a outra equipe.");
  }
  const maxId = equipes.reduce((acc, curr) => Math.max(acc, Number(curr.id) || 0), 0);
  const novoId = maxId + 1;

  const membros = opcoes.filter((i) =>
    payload.instaladorIds.includes(i.id)
  ).map((i) => ({
    id: i.id,
    nome: i.nome,
  }));

  const responsavel = opcoes.find(
    (i) => i.id === payload.responsavelId
  );

  const novaEquipe: Equipe = {
    id: novoId,
    nome: payload.nome,
    especialidade: payload.especialidade || "Instalação Fotovoltaica Geral",
    responsavelId: payload.responsavelId,
    responsavelNome: responsavel?.nome || "Responsável não informado",
    membros,
  };

  gestao.equipes = [...equipes, novaEquipe].map(e => equipeGestaoSchema.parse(e));
  gestao.equipesRevisao = crypto.randomUUID();
  gestao.novos = gestao.novos.map(u => ids.has(u.id) ? { ...u, equipeId: novoId } : u);
  for (const usuario of contas) {
    gestao.contas[String(usuario.id)] = { ...usuario, equipeId: novoId };
    gestao.revisoes[String(usuario.id)] = crypto.randomUUID();
    // O vínculo mudou: a sessão de demonstração anterior deve refazer o login.
    gestao.acessos[usuario.email] = (gestao.acessos[usuario.email] ?? 0) + 1;
  }
  gravarGestao(gestao);
  return novaEquipe;
}
