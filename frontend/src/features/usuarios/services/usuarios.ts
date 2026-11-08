import axios from "axios";
import { herdarContexto403 } from "@/shared/lib/sessaoOperacao";
import { z } from "zod";
import { api, ApiErro } from "@/shared/api/api";
import type { CriarUsuarioPayload, UsuarioCriado, EquipeOpcao } from "../types/usuarios";

const equipesSchema = z.array(z.object({
  id: z.number().int().positive().refine(Number.isSafeInteger),
  nome: z.string().trim().min(1),
}));
const erroSchema = z.object({ error: z.object({ code: z.string().optional() }).optional() });

export async function criarUsuario(payload: CriarUsuarioPayload, sessao403?: number): Promise<UsuarioCriado> {
  try {
    const resposta = await api.post<UsuarioCriado>("/usuarios", payload, { timeout: 15_000, suprimirToast403: true, sessao403, politica401: "sessao" });
    if (resposta.status !== 201) {
      throw new ApiErro(resposta.status, "UNEXPECTED_RESPONSE", "Não foi possível confirmar o cadastro.");
    }
    return resposta.data;
  } catch (erro) {
    if (axios.isAxiosError<unknown>(erro)) {
      const parsed = erroSchema.safeParse(erro.response?.data);
      const codigo = parsed.success ? parsed.data.error?.code : undefined;
      const timeout = erro.code === "ECONNABORTED" || erro.code === "ETIMEDOUT";
      const convertido = new ApiErro(
        erro.response?.status ?? 0,
        timeout ? "TIMEOUT" : codigo ?? (erro.response ? "UNKNOWN_ERROR" : "NETWORK_ERROR"),
        "Não foi possível confirmar o cadastro.",
      );
      herdarContexto403(erro, convertido);
      throw convertido;
    }
    throw erro;
  }
}

export async function listarEquipesOpcoes(sessao403?: number): Promise<EquipeOpcao[]> {
  const { data } = await api.get<unknown>("/equipes", { sessao403, politica401: "sessao" });
  return equipesSchema.parse(data);
}
