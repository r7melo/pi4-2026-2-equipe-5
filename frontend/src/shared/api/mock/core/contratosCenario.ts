import { z } from "zod";
const id = z.number().int().positive().refine(Number.isSafeInteger);
const registro = z.object({ id }).passthrough();
const status = z.enum(["MaterialComprado", "NoDeposito", "Separado", "EmAndamento", "Concluido", "Assistencia"]);
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const autor = z.object({ id, nome: z.string().min(1) });
const obra = registro.extend({ clienteNome: z.string().min(1), status, categoria: z.string(), quantidadePaineis: z.number().nonnegative(), dataFimEstimada: data });
const detalhe = registro.extend({ status, cliente: registro.extend({ nome: z.string().min(1) }), pagamento: registro.extend({ prazoContratualDias: z.number().nonnegative() }), dataInicioEstimada: data, dataFimEstimada: data });
const programa = registro.extend({ obraId: id, equipeId: id, dataInicio: data, dataFim: data, prioridade: z.number(), duracaoEstimadaDias: z.number().positive() });
const material = registro.extend({ obraId: id, descricao: z.string().optional(), tipo: z.string().optional(), quantidade: z.number().nonnegative(), statusLogistico: z.enum(["Comprado", "EmTransito", "Disponivel", "Utilizado"]).nullish() });
const historico = registro.extend({ obraId: id, statusAnterior: z.string(), statusNovo: z.string(), dataAlteracao: z.string(), usuario: autor });
const comentario = registro.extend({ obraId: id, descricao: z.string(), dataRegistro: z.string(), usuario: autor });
const relatorio = z.object({ obraId: id, receita: z.number(), custoTotal: z.number(), lucro: z.number(), itens: z.array(z.object({ descricao: z.string(), valor: z.number() })) }).passthrough();
const gestao = z.object({ versao: z.literal(1), novos: z.array(registro), contas: z.record(z.string(), registro), revisoes: z.record(z.string(), z.string()), acessos: z.record(z.string(), z.number()), equipes: z.array(registro), equipesRevisao: z.string() }).strict();
const formatos: Record<string, z.ZodType> = {
  mock_obras_v3: z.array(obra), mock_detalhes_v1: z.record(z.string(), detalhe),
  mock_clientes_v1: z.array(registro.extend({ nome: z.string(), cidade: z.string(), endereco: z.string() })),
  mock_programacoes_v4: z.array(programa), mock_materiais: z.array(material),
  mock_historico: z.array(historico), mock_comentarios: z.array(comentario),
  mock_relatorios_v1: z.record(z.string(), relatorio), mock_homologacoes_v1: z.record(z.string(), z.object({ obraId: id, parecerAcesso: z.enum(["Pendente", "EmAnalise", "Aprovado", "Reprovado"]) }).passthrough()),
  mock_gestao_usuarios_v1: gestao,
  mock_links_cronograma_v1: z.array(z.object({ token: z.string(), usuarioId: id, dataInicio: data, dataFim: data, expiraEm: z.string(), criadoEm: z.number() })),
  mock_seguranca_senhas_v1: z.object({ versao: z.literal(1), contas: z.record(z.string(), z.unknown()), links: z.record(z.string(), z.unknown()) }).strict(),
  mock_links_relatorios_v1: z.record(z.string(), z.object({ periodoInicio: data, periodoFim: data, clienteFiltro: z.string(), usuarioId: id })),
  mock_tentativas_v1: z.record(z.string(), z.number().int().nonnegative()),
  mock_excluidas_v1: z.record(z.string(), z.object({ obra, detalhe, excluidaEm: z.string() })),
};
export const cenarioSchema = z.object({
  versao: z.literal(1), massa: z.literal(1), geracao: z.string().uuid(), dataBase: data,
  revisao: z.number().int().nonnegative().refine(Number.isSafeInteger), dados: z.record(z.string(), z.string()),
}).strict().superRefine((valor, ctx) => {
  for (const [chave, formato] of Object.entries(formatos)) {
    try { formato.parse(JSON.parse(valor.dados[chave])); }
    catch { ctx.addIssue({ code: "custom", path: ["dados", chave], message: "Dados da demonstracao invalidos." }); }
  }
});
export type Cenario = z.infer<typeof cenarioSchema>;
