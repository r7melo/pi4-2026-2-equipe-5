import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  capturarSessaoOperacional,
  deveExibirErroLocal,
  erroDaSessaoAnterior,
  sessaoOperacionalVigente,
} from "@/shared/lib/sessaoOperacao";
import type { CriarProgramacaoPayload, Programacao } from "@/shared/types/programacoes";
import type { Equipe } from "@/features/cronograma/types/equipes";
import { obterConflitosEquipe } from "@/features/cronograma/lib/ganttCalculos";
import {
  ehErroFalhaRestauracao,
  useReatribuirProgramacao,
} from "@/features/cronograma/hooks/useReatribuirProgramacao";

interface UseReatribuirEquipeGanttParams {
  sessaoRender: number;
  programacoes: Programacao[] | undefined;
  equipes: Equipe[] | undefined;
  tarefaSelecionadaId: number | null;
  setTarefaSelecionadaId: (id: number | null) => void;
  podeEditar: () => boolean;
  reagendamentoBloqueado: boolean;
}

export function useReatribuirEquipeGantt({
  sessaoRender,
  programacoes,
  equipes,
  tarefaSelecionadaId,
  setTarefaSelecionadaId,
  podeEditar,
  reagendamentoBloqueado,
}: UseReatribuirEquipeGanttParams) {
  const { mutateAsync: reatribuirAlocacao, isPending: reatribuindoAlocacao } =
    useReatribuirProgramacao();
  const [anuncioReatribuicao, setAnuncioReatribuicao] = useState("");
  const [sessaoAnuncio, setSessaoAnuncio] = useState(sessaoRender);
  if (sessaoAnuncio !== sessaoRender) {
    setSessaoAnuncio(sessaoRender);
    setAnuncioReatribuicao("");
  }

  const tarefaSelecionadaIdRef = useRef<number | null>(tarefaSelecionadaId);
  useLayoutEffect(() => {
    tarefaSelecionadaIdRef.current = tarefaSelecionadaId;
  }, [tarefaSelecionadaId]);

  const reatribuindoRef = useRef(false);

  const registrarSelecaoComAnuncio = useCallback(
    (id: number | null) => {
      tarefaSelecionadaIdRef.current = id;
      setAnuncioReatribuicao("");
      setTarefaSelecionadaId(id);
    },
    [setTarefaSelecionadaId]
  );

  const handleMudarEquipe = async (id: number, novaEquipeId: number) => {
    if (!podeEditar() || reagendamentoBloqueado || reatribuindoAlocacao || reatribuindoRef.current) {
      return;
    }
    const progAtual = programacoes?.find((p) => p.id === id);
    if (!progAtual) return;

    const novaEquipe = equipes?.find((e) => e.id === novaEquipeId);
    const nomeNovaEquipe = novaEquipe?.nome || `Equipe ${novaEquipeId}`;

    const conflitos = obterConflitosEquipe(
      novaEquipeId,
      progAtual.dataInicio,
      progAtual.dataFim,
      programacoes || [],
      id
    );

    if (conflitos.length > 0) {
      const msgConflito = `A ${nomeNovaEquipe} já possui a Obra #${conflitos[0].programacao.obraId} agendada de ${conflitos[0].periodoFormatado}. Reatribuição cancelada.`;
      toast.error(msgConflito);
      if (tarefaSelecionadaIdRef.current === id) {
        setAnuncioReatribuicao((anterior) =>
          anterior === msgConflito ? `${msgConflito}\u00A0` : msgConflito
        );
      }
      return;
    }

    const sessao = capturarSessaoOperacional();
    const payloadOriginal: CriarProgramacaoPayload = {
      obraId: progAtual.obraId,
      equipeId: progAtual.equipeId,
      dataInicio: progAtual.dataInicio,
      dataFim: progAtual.dataFim,
      prioridade: progAtual.prioridade,
    };
    const payloadNova: CriarProgramacaoPayload = {
      obraId: progAtual.obraId,
      equipeId: novaEquipeId,
      dataInicio: progAtual.dataInicio,
      dataFim: progAtual.dataFim,
      prioridade: progAtual.prioridade,
    };

    reatribuindoRef.current = true;
    setAnuncioReatribuicao("Reatribuindo equipe...");
    try {
      const res = await reatribuirAlocacao(
        {
          id,
          payloadNova,
          payloadOriginal,
          aoSubstituirId: (idAntigo, idNovo) => {
            if (
              sessaoOperacionalVigente(sessao) &&
              podeEditar() &&
              tarefaSelecionadaIdRef.current === idAntigo
            ) {
              tarefaSelecionadaIdRef.current = idNovo;
              setTarefaSelecionadaId(idNovo);
            }
          },
        },
        undefined,
        sessao
      );
      if (!sessaoOperacionalVigente(sessao)) return;
      const msgResultado =
        res.resultado === "reatribuida"
          ? `Obra reatribuída com sucesso para ${nomeNovaEquipe}!`
          : "Falha ao reatribuir equipe. A alocação anterior foi restaurada.";
      if (res.resultado === "reatribuida") {
        toast.success(msgResultado);
      } else {
        toast.error(msgResultado);
      }
      if (tarefaSelecionadaIdRef.current === res.programacao.id) {
        setAnuncioReatribuicao(msgResultado);
      }
    } catch (erro) {
      if (!sessaoOperacionalVigente(sessao) || erroDaSessaoAnterior(erro)) return;
      const exibirLocal = deveExibirErroLocal(erro);
      const msgErro = ehErroFalhaRestauracao(erro)
        ? "Falha ao reatribuir equipe e não foi possível restaurar a alocação anterior. Atualize a página."
        : !exibirLocal
          ? "Você não possui permissão para realizar esta ação."
          : "Erro ao reatribuir equipe para a obra.";
      if (exibirLocal) {
        toast.error(msgErro);
      }
      if (tarefaSelecionadaIdRef.current === id) {
        setAnuncioReatribuicao((anterior) =>
          anterior === msgErro ? `${msgErro}\u00A0` : msgErro
        );
      }
    } finally {
      reatribuindoRef.current = false;
    }
  };

  return {
    reatribuindoAlocacao,
    reatribuindoRef,
    anuncioReatribuicao,
    registrarSelecaoComAnuncio,
    handleMudarEquipe,
  };
}
