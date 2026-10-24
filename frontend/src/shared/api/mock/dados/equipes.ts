import type { Equipe, CriarEquipePayload } from "@/types";

/** 10 Equipes sincronizadas estritamente com database/02_seed.sql */
export const MOCK_EQUIPES_FIXTURE: Equipe[] = [
  { id: 1, nome: "Equipe 01", especialidade: "Instalação Residencial" },
  { id: 2, nome: "Equipe 02", especialidade: "Instalação Comercial" },
  { id: 3, nome: "Equipe 03", especialidade: "Instalação Industrial" },
  { id: 4, nome: "Equipe 04", especialidade: "Instalação Rural" },
  { id: 5, nome: "Equipe 05", especialidade: "Instalação Residencial" },
  { id: 6, nome: "Equipe 06", especialidade: "Instalação Comercial" },
  { id: 7, nome: "Equipe 07", especialidade: "Manutenção e Assistência" },
  { id: 8, nome: "Equipe 08", especialidade: "Instalação Industrial" },
  { id: 9, nome: "Equipe 09", especialidade: "Instalação Rural" },
  { id: 10, nome: "Equipe 10", especialidade: "Manutenção e Assistência" },
];

export interface MockInstalador {
  id: number;
  nome: string;
  email: string;
}

/** 3 Instaladores oficiais sincronizados com database/02_seed.sql (IDs 5, 8 e 9) */
export const MOCK_INSTALADORES_DISPONIVEIS: MockInstalador[] = [
  { id: 5, nome: "Marcos Instalador", email: "instalador@zl.com.br" },
  { id: 8, nome: "Diego Instalador", email: "diego.campo@zl.com.br" },
  { id: 9, nome: "Beatriz Instaladora", email: "beatriz.campo@zl.com.br" },
];

const STORAGE_KEY_EQUIPES = "mock_equipes_v1";

export function obterEquipesArmazenadas(): Equipe[] {
  if (typeof window === "undefined") return MOCK_EQUIPES_FIXTURE;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_EQUIPES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("[Mock] Erro ao ler equipes no sessionStorage:", e);
  }
  salvarEquipesArmazenadas(MOCK_EQUIPES_FIXTURE);
  return MOCK_EQUIPES_FIXTURE;
}

export function salvarEquipesArmazenadas(equipes: Equipe[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY_EQUIPES, JSON.stringify(equipes));
  } catch (e) {
    console.warn("[Mock] Erro ao salvar equipes no sessionStorage:", e);
  }
}

export function adicionarEquipeArmazenada(payload: CriarEquipePayload): Equipe {
  const equipes = obterEquipesArmazenadas();
  const maxId = equipes.reduce((acc, curr) => Math.max(acc, Number(curr.id) || 0), 0);
  const novoId = maxId + 1;

  const membros = MOCK_INSTALADORES_DISPONIVEIS.filter((i) =>
    payload.instaladorIds.includes(i.id)
  ).map((i) => ({
    id: i.id,
    nome: i.nome,
  }));

  const responsavel = MOCK_INSTALADORES_DISPONIVEIS.find(
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
