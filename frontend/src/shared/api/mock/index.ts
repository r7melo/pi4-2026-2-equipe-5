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

// Ultimo registro: transporte real para requisicoes nao atendidas.
mock.onAny().passThrough();
protegerRevogacaoSenhaMock();

export default mock;
