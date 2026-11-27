import axios from "axios";
import { z } from "zod";
import { api, ApiErro } from "@/shared/api/api";
import { dataCivilValida, hojeCivilSaoPaulo } from "@/shared/lib/datasCivis";
import { herdarContexto403 } from "@/shared/lib/sessaoOperacao";
import { usuarioItemSchema, usuariosRespostaSchema, erroGestaoSchema, statusRespostaSchema } from "../types/gestaoUsuarios";
import type { FiltrosUsuarios, EditarUsuario, StatusUsuario } from "../types/gestaoUsuarios";

export interface ParticipacaoFuturaInstalador {
  programacaoId: number;
  obraId: number;
  obraNome: string;
  dataEntrada: string;
  dataSaida: string;
  emAndamento: boolean;
}

const programacaoIntegranteConsultaSchema = z.object({
  id: z.number().int().positive(),
  obraId: z.number().int().positive(),
  equipe: z.object({
    integrantes: z.array(z.object({
      usuarioId: z.number().int().positive(),
      dataEntrada: z.string().refine(dataCivilValida),
      dataSaida: z.string().refine(dataCivilValida),
    })),
  }).optional(),
});

const obrasResumoConsultaSchema = z.object({
  itens: z.array(z.object({
    id: z.number().int().positive(),
    clienteNome: z.string().min(1),
  })),
});
export function mensagemGestao(erro: unknown): string {
  if (erro instanceof ApiErro) return erro.message;
  return "Não foi possível confirmar a operação. Consulte os dados antes de tentar novamente.";
}
async function executar<T>(acao: () => Promise<T>): Promise<T> {
  try { return await acao(); } catch (erro) {
    if (!axios.isAxiosError<unknown>(erro)) throw erro;
    const envelope = erroGestaoSchema.safeParse(erro.response?.data);
    const codigo = envelope.success ? envelope.data.error.code : "UNKNOWN_ERROR";
    const detalhe = ["USER_VERSION_CONFLICT", "EQUIPE_NOT_FOUND", "VALIDATION_ERROR", "USUARIO_NOT_FOUND", "EMAIL_ALREADY_EXISTS"].includes(codigo)
      ? envelope.success ? envelope.data.error.message : undefined
      : undefined;
    const convertido = new ApiErro(erro.response?.status ?? 0, codigo, detalhe || ([404,405].includes(erro.response?.status ?? 0) ? "Gestão de usuários indisponível no momento." : "Não foi possível confirmar a operação. Consulte os dados antes de tentar novamente."));
    herdarContexto403(erro, convertido); throw convertido;
  }
}
export function listarUsuarios(filtros: FiltrosUsuarios, sessao: number, signal?: AbortSignal) {
  return executar(async () => {
    const params = {
      page: filtros.page,
      pageSize: filtros.pageSize,
      ...(filtros.busca ? { nome: filtros.busca } : {}),
      ...(filtros.perfil ? { perfil: filtros.perfil } : {}),
      ...(filtros.ativo !== "todos" ? { ativo: filtros.ativo } : {}),
    };
    const resposta = await api.get("/usuarios", { params, signal, timeout: 15000, sessao403: sessao, politica401: "sessao" });
    const resultado = usuariosRespostaSchema.parse(resposta.data);
    if (resposta.status !== 200 || resultado.page !== filtros.page || resultado.pageSize !== filtros.pageSize || resultado.itens.length > filtros.pageSize || resultado.total < resultado.itens.length || new Set(resultado.itens.map(u => u.id)).size !== resultado.itens.length) throw new ApiErro(0, "UNEXPECTED_RESPONSE", "Não foi possível confirmar a consulta. Tente novamente.");
    return resultado;
  });
}
export function editarUsuario(id: number, dados: EditarUsuario, sessao: number) {
  return executar(async () => {
    const payload = {
      nome: dados.nome.trim(),
      email: dados.email.trim().toLowerCase(),
      perfil: dados.perfil,
      ...(dados.revisao !== undefined ? { revisao: dados.revisao } : {}),
    };
    const resposta = await api.put("/usuarios/" + id, payload, { timeout: 15000, sessao403: sessao, politica401: "sessao" });
    const resultado = usuarioItemSchema.parse(resposta.data);
    if (
      resposta.status !== 200 ||
      resultado.id !== id ||
      resultado.email !== payload.email ||
      resultado.nome !== payload.nome ||
      resultado.perfil !== payload.perfil
    ) {
      throw new ApiErro(0, "UNEXPECTED_RESPONSE", "Não foi possível confirmar a operação. Consulte os dados antes de tentar novamente.");
    }
    return resultado;
  });
}
export function atualizarStatus(id: number, dados: StatusUsuario, sessao: number) {
  return executar(async () => {
    const payload = {
      ativo: dados.ativo,
      ...(dados.revisao !== undefined ? { revisao: dados.revisao } : {}),
    };
    const resposta = await api.patch<unknown>("/usuarios/" + id + "/ativo", payload, { timeout: 15000, sessao403: sessao, politica401: "sessao" });
    const resultado = statusRespostaSchema.parse(resposta.data);
    if (resposta.status !== 200 || resultado.id !== id || resultado.ativo !== dados.ativo) throw new ApiErro(0, "UNEXPECTED_RESPONSE", "Não foi possível confirmar a operação. Consulte os dados antes de tentar novamente.");
    return resultado;
  });
}

export async function listarParticipacoesFuturasInstalador(
  usuarioId: number,
  sessao: number,
  signal?: AbortSignal,
): Promise<ParticipacaoFuturaInstalador[]> {
  return executar(async () => {
    const hoje = hojeCivilSaoPaulo();
    const respostaProgramacoes = await api.get("/programacoes", {
      params: { instaladorId: usuarioId },
      signal,
      timeout: 15000,
      sessao403: sessao,
      politica401: "sessao",
    });
    const programacoes = z.array(programacaoIntegranteConsultaSchema).parse(respostaProgramacoes.data);

    const pendentes: Array<{
      programacaoId: number;
      obraId: number;
      dataEntrada: string;
      dataSaida: string;
      emAndamento: boolean;
    }> = [];

    for (const prog of programacoes) {
      for (const integ of prog.equipe?.integrantes ?? []) {
        if (integ.usuarioId !== usuarioId || integ.dataSaida < hoje) continue;
        pendentes.push({
          programacaoId: prog.id,
          obraId: prog.obraId,
          dataEntrada: integ.dataEntrada,
          dataSaida: integ.dataSaida,
          emAndamento: integ.dataEntrada <= hoje,
        });
      }
    }

    if (pendentes.length === 0) return [];

    const nomesObra = new Map<number, string>();
    try {
      const respostaObras = await api.get("/obras", {
        params: { page: 1, pageSize: 100 },
        signal,
        timeout: 15000,
        sessao403: sessao,
        politica401: "sessao",
      });
      const parsedObras = obrasResumoConsultaSchema.safeParse(respostaObras.data);
      if (parsedObras.success) {
        for (const obra of parsedObras.data.itens) {
          nomesObra.set(obra.id, obra.clienteNome);
        }
      }
    } catch (erro) {
      if (axios.isAxiosError(erro) && (erro.code === "ERR_CANCELED" || erro.response?.status === 401 || erro.response?.status === 403)) {
        throw erro;
      }
    }

    const resultado: ParticipacaoFuturaInstalador[] = [];
    for (const item of pendentes) {
      resultado.push({
        programacaoId: item.programacaoId,
        obraId: item.obraId,
        obraNome: nomesObra.get(item.obraId) ?? `Obra #${item.obraId}`,
        dataEntrada: item.dataEntrada,
        dataSaida: item.dataSaida,
        emAndamento: item.emAndamento,
      });
    }
    return resultado.sort(
      (a, b) => a.dataEntrada.localeCompare(b.dataEntrada) || a.dataSaida.localeCompare(b.dataSaida) || a.programacaoId - b.programacaoId,
    );
  });
}
