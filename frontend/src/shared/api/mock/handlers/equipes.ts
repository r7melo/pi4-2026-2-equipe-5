import type MockAdapter from "axios-mock-adapter";
import { MOCK_INSTALADORES_DISPONIVEIS, obterEquipesArmazenadas, adicionarEquipeArmazenada } from "../dados/equipes";
import { extrairDados } from "../core/http";
import type { CriarEquipePayload } from "@/types";

export function registrarEquipes(mock: MockAdapter): void {
  // GET /api/instaladores — Instaladores para montagem de equipes
  mock.onGet(/\/instaladores\/?(\?.*)?$/).reply(() => [200, MOCK_INSTALADORES_DISPONIVEIS]);
  
  // GET /api/equipes — Listagem de equipes
  mock.onGet(/\/equipes\/?(\?.*)?$/).reply(() => [200, obterEquipesArmazenadas()]);
  
  // POST /api/equipes — Criação de equipe com validação
  mock.onPost(/\/equipes\/?(\?.*)?$/).reply((config) => {
    const payload = extrairDados<CriarEquipePayload>(config.data);
    if (!payload.nome?.trim() || !payload.responsavelId || !payload.instaladorIds?.length) {
      return [
        400,
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Nome, ao menos um instalador e um responsável são obrigatórios.",
          },
        },
      ];
    }
    const equipe = adicionarEquipeArmazenada(payload);
    return [201, equipe];
  });
}
