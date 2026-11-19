import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useMutacaoSessao as useMutation } from "@/shared/hooks/useMutacaoSessao";
import {
  deveExibirErroLocal,
  exigirSessaoOperacional,
  herdarContexto403,
  sessaoOperacionalVigente,
  statusHttp,
} from "@/shared/lib/sessaoOperacao";
import {
  criarProgramacao,
  deletarProgramacao,
} from "@/features/cronograma/services/programacoes";
import type { CriarProgramacaoPayload, Programacao } from "@/shared/types/programacoes";

export interface ReatribuirProgramacaoVariaveis {
  id: number;
  payloadNova: CriarProgramacaoPayload;
  payloadOriginal: CriarProgramacaoPayload;
  aoSubstituirId?: (idAntigo: number, idNovo: number) => void;
}

export interface ReatribuirProgramacaoResultado {
  resultado: "reatribuida" | "restaurada";
  programacao: Programacao;
}

class ErroFalhaRestauracaoProgramacao extends Error {
  readonly status?: number;

  constructor(erroOriginal?: unknown, erroRollback?: unknown) {
    super(
      "Falha ao reatribuir equipe e não foi possível restaurar a alocação anterior. Atualize a página."
    );
    this.name = "ErroFalhaRestauracaoProgramacao";
    this.status = statusHttp(erroRollback) ?? statusHttp(erroOriginal);
    if (erroRollback && typeof erroRollback === "object") {
      herdarContexto403(erroRollback, this);
    } else if (erroOriginal && typeof erroOriginal === "object") {
      herdarContexto403(erroOriginal, this);
    }
  }
}

export function ehErroFalhaRestauracao(erro: unknown): boolean {
  return erro instanceof ErroFalhaRestauracaoProgramacao;
}

export interface ServicosReatribuicaoProgramacao {
  deletarProgramacao: typeof deletarProgramacao;
  criarProgramacao: typeof criarProgramacao;
}

export interface ContextoExecucaoReatribuicao {
  readonly queryClient: QueryClient;
  readonly variaveis: ReatribuirProgramacaoVariaveis;
  readonly sessao: number;
  readonly servicos?: ServicosReatribuicaoProgramacao;
}

export async function executarReatribuicaoProgramacao({
  queryClient,
  variaveis,
  sessao,
  servicos = { deletarProgramacao, criarProgramacao },
}: ContextoExecucaoReatribuicao): Promise<ReatribuirProgramacaoResultado> {
  const { id, payloadNova, payloadOriginal, aoSubstituirId } = variaveis;
  await servicos.deletarProgramacao(id, sessao);
  exigirSessaoOperacional(sessao);

  let novaProg: Programacao;
  try {
    novaProg = await servicos.criarProgramacao(payloadNova, sessao);
  } catch (erro) {
    if (
      sessaoOperacionalVigente(sessao) &&
      deveExibirErroLocal(erro) &&
      statusHttp(erro) !== 401 &&
      statusHttp(erro) !== 403
    ) {
      try {
        const restaurada = await servicos.criarProgramacao(payloadOriginal, sessao);
        if (sessaoOperacionalVigente(sessao)) {
          queryClient.setQueryData<Programacao[]>(["programacoes", sessao], (atuais) =>
            atuais
              ? [...atuais.filter((p) => p.id !== id && p.id !== restaurada.id), restaurada]
              : [restaurada]
          );
          aoSubstituirId?.(id, restaurada.id);
          void queryClient.invalidateQueries({ queryKey: ["programacoes", sessao] });
        }
        return { resultado: "restaurada", programacao: restaurada };
      } catch (erroRollback) {
        if (sessaoOperacionalVigente(sessao) && statusHttp(erroRollback) !== 401) {
          void queryClient.invalidateQueries({ queryKey: ["programacoes", sessao] });
        }
        if (!sessaoOperacionalVigente(sessao)) {
          exigirSessaoOperacional(sessao);
        }
        throw new ErroFalhaRestauracaoProgramacao(erro, erroRollback);
      }
    }
    if (sessaoOperacionalVigente(sessao) && statusHttp(erro) !== 401) {
      void queryClient.invalidateQueries({ queryKey: ["programacoes", sessao] });
    }
    throw erro instanceof Error ? erro : new Error(String(erro));
  }

  if (sessaoOperacionalVigente(sessao)) {
    queryClient.setQueryData<Programacao[]>(["programacoes", sessao], (atuais) =>
      atuais
        ? [...atuais.filter((p) => p.id !== id && p.id !== novaProg.id), novaProg]
        : [novaProg]
    );
    aoSubstituirId?.(id, novaProg.id);
    void queryClient.invalidateQueries({ queryKey: ["programacoes", sessao] });
  }
  return { resultado: "reatribuida", programacao: novaProg };
}

export function useReatribuirProgramacao() {
  const queryClient = useQueryClient();
  return useMutation<ReatribuirProgramacaoResultado, ReatribuirProgramacaoVariaveis>({
    mutationKey: ["programacoes"],
    mutationFn: (variaveis, sessao) =>
      executarReatribuicaoProgramacao({ queryClient, variaveis, sessao }),
  });
}
