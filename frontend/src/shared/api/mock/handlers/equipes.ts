import type MockAdapter from "axios-mock-adapter";
import { obterEquipesArmazenadas, adicionarEquipeArmazenada } from "../dados/equipes";
import { instaladoresEfetivos } from "../dados/operacoesGestao";
import { erroUsuarioMock } from "../core/auth";
import { extrairDados } from "../core/http";
import type { CriarEquipePayload } from "@/types";

export function registrarEquipes(mock: MockAdapter): void {
  // GET /api/instaladores — Instaladores para montagem de equipes
  mock.onGet(/\/instaladores\/?(\?.*)?$/).reply(() => { try { return [200, instaladoresEfetivos()]; } catch { return erroUsuarioMock(500, "INTERNAL_ERROR", "Não foi possível consultar instaladores."); } });
  
  // GET /api/equipes — Listagem de equipes
  mock.onGet(/\/equipes\/?(\?.*)?$/).reply(() => { try { return [200, obterEquipesArmazenadas()]; } catch { return erroUsuarioMock(500, "INTERNAL_ERROR", "Não foi possível consultar equipes."); } });
  
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
    try {
      const opcoes = instaladoresEfetivos();
      if (!payload.instaladorIds.includes(payload.responsavelId) || payload.instaladorIds.some(id => !opcoes.some(o => o.id === id))) return erroUsuarioMock(400, "VALIDATION_ERROR", "Selecione instaladores disponíveis e um responsável integrante.");
      const equipe = adicionarEquipeArmazenada(payload, opcoes);
      return [201, equipe];
    } catch { return erroUsuarioMock(500, "INTERNAL_ERROR", "Não foi possível criar a equipe."); }
  });
}
