// Executar em frontend: node tests/cadastro-sem-equipe.mjs
// Usa o Vite ja instalado para carregar os modulos reais, sem framework adicional.
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const itens = new Map();
const storage = {
  getItem: chave => itens.get(chave) ?? null,
  setItem: (chave, valor) => itens.set(chave, String(valor)),
  removeItem: chave => itens.delete(chave),
};
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: storage });
Object.defineProperty(globalThis, "window", { configurable: true, value: new EventTarget() });
Object.defineProperty(globalThis, "navigator", { configurable: true, value: {
  locks: { request: async (_nome, _opcoes, tarefa) => tarefa() },
} });

const server = await createServer({ root, configFile: false, server: { middlewareMode: true },
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { "@": path.join(root, "src") } } });
try {
  const { cadastroUsuarioSchema } = await server.ssrLoadModule("/src/features/usuarios/types/usuarios.ts");
  const usuarios = await server.ssrLoadModule("/src/shared/api/mock/dados/usuarios.ts");
  const cenario = await server.ssrLoadModule("/src/shared/api/mock/core/estadoCenario.ts");
  const estado = await server.ssrLoadModule("/src/shared/api/mock/dados/estadoGestao.ts");
  const gestao = await server.ssrLoadModule("/src/shared/api/mock/dados/operacoesGestao.ts");
  const equipes = await server.ssrLoadModule("/src/shared/api/mock/dados/equipes.ts");
  const entrada = { nome: "Novo Instalador", email: "novo@example.com", senha: "Senha123!", perfil: "InstaladorCampo", equipeId: "" };
  assert.equal(cadastroUsuarioSchema.parse(entrada).equipeId, null);
  assert.equal(cadastroUsuarioSchema.parse({ ...entrada, equipeId: "7" }).equipeId, 7);
  for (const equipeId of ["0", "-1", "1.2", "abc", " ", "9007199254740992"]) {
    assert.equal(cadastroUsuarioSchema.safeParse({ ...entrada, equipeId }).success, false);
  }
  assert.equal(cadastroUsuarioSchema.parse({ ...entrada, perfil: "Financeiro", equipeId: "7" }).equipeId, null);
  console.log("PASSOU: formulario envia null sem equipe e valida IDs informados");

  const payload = cadastroUsuarioSchema.parse(entrada);
  assert.equal(usuarios.validarCadastroUsuarioMock(payload).success, true);
  assert.equal(usuarios.validarCadastroUsuarioMock({ ...payload, equipeId: 0 }).success, false);
  await cenario.iniciarCenario();
  const transacao = tarefa => cenario.executarTransacaoCenario(cenario.geracaoCenario(), async () => { await tarefa(); return true; }, Boolean);
  const anteriores = usuarios.obterUsuariosCriados();
  const senhaHash = await usuarios.gerarHashSenhaMock(entrada.senha);
  const livres = [1001, 1002].map(id => ({ id, nome: `Instalador ${id}`, email: `livre${id}@example.com`,
    perfil: "InstaladorCampo", equipeId: null, ativo: true, senhaHash }));
  const equipesAntes = JSON.stringify(equipes.obterEquipesArmazenadas());
  await transacao(() => usuarios.salvarUsuariosCriados([...anteriores, ...livres]));
  assert.equal(JSON.stringify(equipes.obterEquipesArmazenadas()), equipesAntes);
  const recarregado = JSON.parse(JSON.parse(storage.getItem(cenario.CHAVE_CENARIO)).dados[estado.CHAVE_GESTAO]);
  assert.equal(recarregado.novos.find(u => u.id === 1001).equipeId, null);
  assert.equal(usuarios.obterUsuariosCriados().find(u => u.id === 1001).equipeId, null);
  assert.equal(usuarios.buscarUsuarioPorEmailMock(livres[0].email).equipeId, null);
  assert.equal(gestao.instaladoresEfetivos().some(u => u.id === 1001), true);
  console.log("PASSOU: mock persiste e rele instalador livre, sem associacao, disponivel para equipe");

  let equipe;
  await transacao(() => { equipe = equipes.adicionarEquipeArmazenada({ nome: "Nova Equipe", responsavelId: 1001,
    instaladorIds: [1001, 1002] }, gestao.instaladoresEfetivos()); });
  assert.deepEqual(equipe.membros.map(u => u.id), [1001, 1002]);
  const aposEquipe = JSON.parse(JSON.parse(storage.getItem(cenario.CHAVE_CENARIO)).dados[estado.CHAVE_GESTAO]);
  for (const livre of livres) {
    assert.equal(aposEquipe.novos.find(u => u.id === livre.id).equipeId, equipe.id);
    assert.equal(aposEquipe.contas[String(livre.id)].equipeId, equipe.id);
    assert.equal(usuarios.buscarUsuarioPorEmailMock(livre.email).equipeId, equipe.id);
    assert.equal(aposEquipe.acessos[livre.email], 1);
    assert.equal(aposEquipe.novos.find(u => u.id === livre.id).senhaHash, senhaHash);
  }
  console.log("PASSOU: criar equipe persiste membros, responsavel e vinculos e invalida sessao antiga");

  const antesFalha = storage.getItem(cenario.CHAVE_CENARIO);
  await assert.rejects(() => transacao(() => equipes.adicionarEquipeArmazenada({ nome: "Outra Equipe",
    responsavelId: 1001, instaladorIds: [1001] }, gestao.instaladoresEfetivos())), equipes.InstaladorVinculadoError);
  assert.equal(storage.getItem(cenario.CHAVE_CENARIO), antesFalha);
  console.log("PASSOU: mock recusa transferencia implicita sem alterar armazenamento");
} finally {
  await server.close();
}
