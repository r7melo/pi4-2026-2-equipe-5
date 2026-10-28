import type MockAdapter from "axios-mock-adapter";
import { clientesCenario } from "../dados/detalhes";
export function registrarClientes(mock: MockAdapter): void {
  mock.onGet(/\/clientes\/?(?:\?.*)?$/).reply(() => [200, { itens: clientesCenario(), total: clientesCenario().length }]);
}
