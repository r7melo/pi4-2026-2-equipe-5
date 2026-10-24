import type MockAdapter from "axios-mock-adapter";
import { obterHomologacaoObraArmazenada } from "../dados/homologacao";

export function registrarHomologacao(mock: MockAdapter): void {
  // GET /obras/:id/homologacao (Rota #17)
  mock.onGet(/\/obras\/\d+\/homologacao\/?(\?.*)?$/).reply((config) => {
    const match = config.url?.match(/\/obras\/(\d+)\/homologacao/);
    const id = match ? Number(match[1]) : 0;
    const homologacao = obterHomologacaoObraArmazenada(id);
    return [200, homologacao];
  });
}
