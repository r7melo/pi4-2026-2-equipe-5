import { registrarClientes } from "./handlers/clientes";
import { iniciarCenario } from "./core/estadoCenario";
import { coordenarTransporteMock } from "./core/coordenacao";
import { registrarGestaoUsuarios } from "./handlers/gestaoUsuarios";
import MockAdapter from "axios-mock-adapter";
import { api } from "@/shared/api/api";
import { registrarAuth } from "./handlers/auth";
import { registrarObras, registrarExclusaoObra } from "./handlers/obras";
import { registrarConsultasCronograma, registrarAlocacoes } from "./handlers/programacoes";
import { registrarMateriais } from "./handlers/materiais";
import { registrarRegistros } from "./handlers/registros";
import { registrarInstalacao } from "./handlers/instalacao";
import { registrarFinanceiro } from "./handlers/financeiro";
import { registrarHomologacao } from "./handlers/homologacao";
import { registrarCronogramaPublico } from "./handlers/publico";
import { registrarEquipes } from "./handlers/equipes";
import { registrarUsuarios } from "./handlers/usuarios";
import { protegerRevogacaoSenhaMock } from "./core/revogacaoSenha";

const mock = new MockAdapter(api, { delayResponse: 0 });
console.log("🚧 [MOCK MODE] Backend simulado ativo com axios-mock-adapter (delay: 0ms)");

registrarAuth(mock);
registrarClientes(mock);
registrarObras(mock);
registrarConsultasCronograma(mock);
registrarMateriais(mock);
registrarRegistros(mock);
registrarInstalacao(mock);
registrarFinanceiro(mock);
registrarAlocacoes(mock);
registrarHomologacao(mock);
registrarCronogramaPublico(mock);
registrarExclusaoObra(mock);
registrarEquipes(mock);
registrarUsuarios(mock);
registrarGestaoUsuarios(mock);

// Ultimo registro: transporte real para requisicoes nao atendidas.
mock.onAny().passThrough();
protegerRevogacaoSenhaMock();
coordenarTransporteMock();
try { await iniciarCenario(); } catch { /* A interface de recuperacao apresenta o erro sem sobrescrever o acervo. */ }

export default mock;
