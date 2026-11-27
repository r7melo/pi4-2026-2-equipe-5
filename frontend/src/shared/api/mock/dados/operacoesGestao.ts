import { listarContasBaseMock } from "./usuarios";
import { obterEquipesArmazenadas } from "./equipes";
import { contaGestaoSchema, equipeGestaoSchema, lerGestao, gravarGestao } from "./estadoGestao";

export class FalhaGestao extends Error {
  status: number; codigo: string;
  constructor(status: number, codigo: string, mensagem: string) { super(mensagem); this.status = status; this.codigo = codigo; }
}
export function equipesValidas() { return obterEquipesArmazenadas(); }
export function contasEfetivas() {
  return listarContasBaseMock().map(u =>
    contaGestaoSchema.parse({ ...u, perfil: u.perfil.nomePerfil, ativo: u.ativo !== false })
  );
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
  return !!conta && equipesValidas().some(e => e.responsavelId !== undefined && e.responsavelId === id);
}
export function instaladoresEfetivos() {
  return contasEfetivas().filter(c => c.ativo && c.perfil === "InstaladorCampo").map(c => ({ id: c.id, nome: c.nome, email: c.email }));
}
export function modificarUsuario(
  id: number,
  dados: { nome?: string; email?: string; perfil?: string; equipeId?: number | null; ativo?: boolean; revisao?: string },
  operador: number,
) {
  const atual = itemUsuario(id);
  if (dados.revisao !== undefined && atual.revisao !== dados.revisao) {
    throw new FalhaGestao(409, "USER_VERSION_CONFLICT", "Este usuário foi alterado. Recarregue os dados antes de salvar.");
  }
  const emailNormalizado = dados.email !== undefined ? dados.email.trim().toLowerCase() : atual.email;
  const proxima = contaGestaoSchema.parse({ ...atual, ...dados, email: emailNormalizado });
  if (proxima.email !== atual.email && contasEfetivas().some(c => c.id !== id && c.email.toLowerCase() === proxima.email.toLowerCase())) {
    throw new FalhaGestao(409, "EMAIL_ALREADY_EXISTS", "Este e-mail já está cadastrado.");
  }
  if (proxima.perfil !== "InstaladorCampo") proxima.equipeId = proxima.perfil === atual.perfil ? atual.equipeId : null;
  if (id === operador && (!proxima.ativo || proxima.perfil !== "Administrador")) throw new FalhaGestao(400, "VALIDATION_ERROR", "Não é possível alterar o acesso da própria conta.");
  const vinculoMudou = proxima.equipeId !== atual.equipeId || proxima.perfil !== atual.perfil;
  const equipes = equipesValidas();
  if (proxima.equipeId !== null && !equipes.some(e => e.id === proxima.equipeId)) throw new FalhaGestao(404, "EQUIPE_NOT_FOUND", "Equipe não encontrada.");
  if (vinculoMudou && responsavelUsuario(id)) throw new FalhaGestao(400, "VALIDATION_ERROR", "Substitua o responsável na gestão de equipes antes de alterar este vínculo.");
  const ids = [id];
  const estado = lerGestao();
  const operacional = ids[0];
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
  if (vinculoMudou || (atual.ativo && !proxima.ativo) || proxima.email !== atual.email || proxima.perfil !== atual.perfil) {
    estado.acessos[atual.email] = (estado.acessos[atual.email] ?? 0) + 1;
    if (proxima.email !== atual.email) {
      estado.acessos[proxima.email] = (estado.acessos[proxima.email] ?? 0) + 1;
    }
  }
  gravarGestao(estado);
  return itemUsuario(id);
}
