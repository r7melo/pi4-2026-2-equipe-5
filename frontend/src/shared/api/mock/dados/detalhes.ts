import { z } from "zod";
import type { ObraCard, ObraDetalhe, EditarObraPayload } from "@/types";
import { novaObraSchema } from "@/shared/types/obrasCadastro";
import { lerDadosCenario, salvarDadosCenario, dataLocalCenario } from "../core/estadoCenario";
import { obterObrasArmazenadas, salvarObrasArmazenadas } from "./obras";
import { adicionarHistoricoArmazenado } from "./registros";

export const clienteCenarioSchema = z.object({ id: z.number().int().positive(), nome: z.string().min(1), cidade: z.string(), endereco: z.string(), cpfCnpj: z.string().optional(), telefone: z.string().optional(), email: z.string().optional() });
export type ClienteCenario = z.infer<typeof clienteCenarioSchema>;
export function clientesCenario(): ClienteCenario[] { return lerDadosCenario("mock_clientes_v1"); }
export function detalheCenario(id: number): ObraDetalhe | undefined {
  if (!obterObrasArmazenadas().some(o => o.id === id)) return undefined;
  return lerDadosCenario<Record<number, ObraDetalhe>>("mock_detalhes_v1")[id];
}
const payloadSchema = z.object({
  clienteId: z.number().int().positive().optional(),
  cliente: z.object({ nome: z.string().min(3), cidade: z.string().optional(), endereco: z.string().optional(), cpfCnpj: z.string().optional(), telefone: z.string().optional(), email: z.string().optional() }).optional(),
  categoria: z.enum(["Residencial", "Comercial"]), quantidadePaineis: z.number().int().positive(), quantidadeInversores: z.number().int().nonnegative(),
  endereco: z.string().optional(), dataInicioEstimada: z.string(), dataFimEstimada: z.string(),
  pagamento: z.object({ prazoContratualDias: z.number().int().positive(), dataConfirmacao: z.string().optional() }),
});
export function cadastrarObraCenario(valor: unknown, usuario: { id: number; nome: string }): ObraDetalhe {
  const dados = payloadSchema.parse(valor);
  const clientes = clientesCenario();
  let cliente = clientes.find(c => c.id === dados.clienteId);
  if (dados.cliente) {
    cliente = clienteCenarioSchema.parse({ id: Math.max(0, ...clientes.map(c => c.id)) + 1, ...dados.cliente, cidade: dados.cliente.cidade ?? "", endereco: dados.cliente.endereco ?? dados.endereco ?? "" });
    clientes.push(cliente);
    salvarDadosCenario("mock_clientes_v1", clientes);
  }
  if (!cliente) throw new Error("Cliente não encontrado.");
  // Reutiliza o contrato do formulario para datas e dimensionamento.
  novaObraSchema.parse({ tipoCliente: "existente", clienteId: cliente.id, clienteNome: cliente.nome, cidade: cliente.cidade, categoria: dados.categoria, quantidadePaineis: dados.quantidadePaineis, quantidadeInversores: dados.quantidadeInversores, endereco: dados.endereco ?? cliente.endereco, dataInicioEstimada: dados.dataInicioEstimada, dataFimEstimada: dados.dataFimEstimada, pagamento: dados.pagamento });
  const obras = obterObrasArmazenadas();
  const excluidas = lerDadosCenario<Record<number, unknown>>("mock_excluidas_v1");
  const id = Math.max(300, ...obras.map(o => o.id), ...Object.keys(excluidas).map(Number)) + 1;
  const detalhe: ObraDetalhe = { id, status: "MaterialComprado", ...dados, cliente: { id: cliente.id, nome: cliente.nome, cidade: cliente.cidade }, pagamento: { id, ...dados.pagamento }, dataInicioReal: null, dataFimReal: null };
  const card: ObraCard = { id, status: detalhe.status, clienteNome: cliente.nome, cidade: cliente.cidade, categoria: dados.categoria, quantidadePaineis: dados.quantidadePaineis, dataFimEstimada: dados.dataFimEstimada, endereco: dados.endereco, prazoContratualDias: dados.pagamento.prazoContratualDias, atualizadoPor: usuario.nome };
  salvarObrasArmazenadas([card, ...obras]);
  const detalhes = lerDadosCenario<Record<number, ObraDetalhe>>("mock_detalhes_v1");
  detalhes[id] = detalhe; salvarDadosCenario("mock_detalhes_v1", detalhes);
  adicionarHistoricoArmazenado(id, "Criado", "MaterialComprado", "Obra cadastrada.", usuario);
  return detalhe;
}
export function editarDetalheCenario(id: number, dados: EditarObraPayload): ObraDetalhe | undefined {
  const anterior = detalheCenario(id);
  if (!anterior) return undefined;
  const proximo: ObraDetalhe = { ...anterior, ...dados, cliente: { ...anterior.cliente, ...(dados.cidade !== undefined ? { cidade: dados.cidade } : {}) }, pagamento: { ...anterior.pagamento, ...dados.pagamento } };
  const detalhes = lerDadosCenario<Record<number, ObraDetalhe>>("mock_detalhes_v1");
  detalhes[id] = proximo; salvarDadosCenario("mock_detalhes_v1", detalhes);
  salvarObrasArmazenadas(obterObrasArmazenadas().map(o => o.id !== id ? o : Object.assign({}, o, { categoria: dados.categoria ?? o.categoria, quantidadePaineis: dados.quantidadePaineis ?? o.quantidadePaineis, cidade: dados.cidade ?? o.cidade, endereco: dados.endereco ?? o.endereco, observacoes: dados.descricao ?? o.observacoes, dataFimEstimada: proximo.dataFimEstimada, prazoContratualDias: proximo.pagamento.prazoContratualDias })));
  return proximo;
}
export function registrarDatasReais(id: number, status: ObraDetalhe["status"]): void {
  const detalhes = lerDadosCenario<Record<number, ObraDetalhe>>("mock_detalhes_v1");
  const detalhe = detalhes[id];
  const hoje = dataLocalCenario();
  detalhe.status = status;
  if (status === "EmAndamento") { detalhe.dataInicioReal ??= hoje; detalhe.dataFimReal = null; }
  if (status === "Concluido") { detalhe.dataInicioReal ??= hoje; detalhe.dataFimReal = hoje; }
  salvarDadosCenario("mock_detalhes_v1", detalhes);
  salvarObrasArmazenadas(obterObrasArmazenadas().map(o => o.id !== id ? o : Object.assign({}, o, { ...(detalhe.dataFimReal ? { dataFimReal: detalhe.dataFimReal } : { dataFimReal: undefined }) })));
}
