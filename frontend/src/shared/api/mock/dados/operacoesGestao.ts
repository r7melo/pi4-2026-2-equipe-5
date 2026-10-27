import { z } from "zod";
import { MOCK_USUARIOS, obterUsuariosCriados, buscarUsuarioPorEmailMock } from "./usuarios";
import { MOCK_INSTALADORES_DISPONIVEIS, obterEquipesArmazenadas } from "./equipes";
import { contaGestaoSchema, equipeGestaoSchema, lerGestao, gravarGestao } from "./estadoGestao";

export class FalhaGestao extends Error {
  status: number; codigo: string;
  constructor(status: number, codigo: string, mensagem: string) { super(mensagem); this.status = status; this.codigo = codigo; }
}
export function equipesValidas() {
  const raw = sessionStorage.getItem("mock_equipes_v1");
  if (raw !== null) z.array(equipeGestaoSchema).parse(JSON.parse(raw));
  return obterEquipesArmazenadas();
}
export function contasEfetivas() {
  const emails = [...Object.keys(MOCK_USUARIOS), ...obterUsuariosCriados().map(u => u.email)];
  return emails.map(email => {
    const u = buscarUsuarioPorEmailMock(email);
    if (!u) throw new Error("Conta inconsistente.");
    return contaGestaoSchema.parse({ ...u, perfil: u.perfil.nomePerfil, ativo: u.ativo !== false });
  });
}
function aliases(email: string, id: number): number[] {
  const legado = MOCK_INSTALADORES_DISPONIVEIS.find(u => u.email === email);
  if (legado) return [...new Set([id, legado.id])];
  if (!MOCK_INSTALADORES_DISPONIVEIS.some(u => u.id === id)) return [id];
  const estado = lerGestao();
  if (estado.operacionais[email]) return [estado.operacionais[email]];
  // Referências antigas com este número pertencem ao instalador legado, não à conta criada.
  const usados = [...contasEfetivas().map(u => u.id), ...MOCK_INSTALADORES_DISPONIVEIS.map(u => u.id), ...Object.values(estado.operacionais), ...equipesValidas().flatMap(e => [e.responsavelId ?? 0].concat((e.membros ?? []).map(m => m.id)))];
  const novo = Math.max(0, ...usados) + 1;
  if (!Number.isSafeInteger(novo)) throw new Error("Identificador operacional indisponível.");
  estado.operacionais[email] = novo; gravarGestao(estado); return [novo];
}
export function itemUsuario(id: number) {
  const conta = contasEfetivas().find(u => u.id === id);
  if (!conta) throw new FalhaGestao(404, "USUARIO_NOT_FOUND", "Usuário não encontrado.");
  const estado = lerGestao();
  const responsabilidades = equipesValidas().map(e => [e.id, e.responsavelId ?? null]);
  return { ...conta, equipeNome: equipesValidas().find(e => e.id === conta.equipeId)?.nome ?? null,
    revisao: JSON.stringify([estado.revisoes[id] ?? "0", estado.equipesRevisao, responsabilidades]) };
}
export function responsavelUsuario(id: number): boolean {
  const conta = contasEfetivas().find(u => u.id === id);
  return !!conta && equipesValidas().some(e => e.responsavelId !== undefined && aliases(conta.email, id).includes(e.responsavelId));
}
export function instaladoresEfetivos() {
  const contas = contasEfetivas();
  const legados = MOCK_INSTALADORES_DISPONIVEIS.flatMap(legado => {
    const conta = contas.find(c => c.email === legado.email);
    if (conta && (!conta.ativo || conta.perfil !== "InstaladorCampo")) return [];
    // O ID operacional do legado não identifica uma conta criada que coincida numericamente.
    return [{ ...legado, nome: conta?.nome ?? legado.nome }];
  });
  const extras = contas.filter(c => c.ativo && c.perfil === "InstaladorCampo" && !MOCK_INSTALADORES_DISPONIVEIS.some(l => l.email === c.email));
  return [...legados, ...extras.map(c => ({ id: aliases(c.email, c.id)[0], nome: c.nome, email: c.email }))];
}
export function modificarUsuario(id: number, dados: { nome?: string; perfil?: string; equipeId?: number | null; ativo?: boolean; revisao: string }, operador: number) {
  const atual = itemUsuario(id);
  if (atual.revisao !== dados.revisao) throw new FalhaGestao(409, "USER_VERSION_CONFLICT", "Este usuário foi alterado. Recarregue os dados antes de salvar.");
  const proxima = contaGestaoSchema.parse({ ...atual, ...dados });
  if (proxima.perfil !== "InstaladorCampo") proxima.equipeId = proxima.perfil === atual.perfil ? atual.equipeId : null;
  if (id === operador && (!proxima.ativo || proxima.perfil !== "Administrador")) throw new FalhaGestao(400, "VALIDATION_ERROR", "Não é possível alterar o acesso da própria conta.");
  const vinculoMudou = proxima.equipeId !== atual.equipeId || proxima.perfil !== atual.perfil;
  const equipes = equipesValidas();
  if (proxima.perfil === "InstaladorCampo" && proxima.equipeId === null) throw new FalhaGestao(400, "VALIDATION_ERROR", "Selecione uma equipe.");
  if (proxima.equipeId !== null && !equipes.some(e => e.id === proxima.equipeId)) throw new FalhaGestao(404, "EQUIPE_NOT_FOUND", "Equipe não encontrada.");
  if (vinculoMudou && responsavelUsuario(id)) throw new FalhaGestao(400, "VALIDATION_ERROR", "Substitua o responsável na gestão de equipes antes de alterar este vínculo.");
  const ids = aliases(atual.email, id);
  const estado = lerGestao();
  const operacional = MOCK_INSTALADORES_DISPONIVEIS.find(l => l.email === atual.email)?.id ?? ids[0];
  const equipesNovas = equipes.map(e => {
    let membros = e.membros;
    if (vinculoMudou) {
      membros = (membros ?? []).filter(m => !ids.includes(m.id));
      if (e.id === proxima.equipeId) membros.push({ id: operacional, nome: proxima.nome });
    } else if (membros) membros = membros.map(m => ids.includes(m.id) ? Object.assign({}, m, { nome: proxima.nome }) : m);
    return Object.assign({}, e, membros ? { membros } : {}, e.responsavelId !== undefined && ids.includes(e.responsavelId) ? { responsavelNome: proxima.nome } : {});
  });
  const mudou = JSON.stringify({ ...atual, equipeNome: undefined, revisao: undefined }) !== JSON.stringify(proxima);
  if (!mudou) return atual;
  estado.contas[id] = proxima;
  estado.revisoes[id] = crypto.randomUUID();
  estado.equipes = equipesNovas.map(e => equipeGestaoSchema.parse(e));
  if (vinculoMudou || (atual.ativo && !proxima.ativo)) estado.acessos[atual.email] = (estado.acessos[atual.email] ?? 0) + 1;
  gravarGestao(estado);
  return itemUsuario(id);
}
