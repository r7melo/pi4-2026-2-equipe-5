import { lerGestao, gravarGestao, equipeGestaoSchema } from "./estadoGestao";
import type { Equipe, CriarEquipePayload } from "@/types";

export interface MockInstalador {
  id: number;
  nome: string;
  email: string;
}



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
  const equipes = obterEquipesArmazenadas();
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

  const atualizadas = [...equipes, novaEquipe];
  salvarEquipesArmazenadas(atualizadas);
  return novaEquipe;
}
