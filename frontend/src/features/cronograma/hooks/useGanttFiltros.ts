import { useState, useEffect, useMemo, useCallback, type SetStateAction } from "react";
import { formatarDataISO } from "@/shared/lib/formatters";
import { useGanttStore } from "@/features/cronograma/stores/useGanttStore";
import type { GanttFiltrosAvancados } from "@/features/cronograma/types/gantt";
import type {
  UseGanttFiltrosParams,
  UseGanttFiltrosRetorno,
} from "@/features/cronograma/types/visaoCronograma";
import { materialEstaPronto } from "@/features/cronograma/lib/prontidaoObra";

/**
 * Hook customizado para encapsular a gestão dos 10 filtros do Gantt,
 * contagem de filtros ativos e derivação da lista de programações filtradas.
 */
export function useGanttFiltros({
  programacoes,
  obras,
  podeUsarInterface,
}: UseGanttFiltrosParams = {}): UseGanttFiltrosRetorno {
  const [hojeISO, setHojeISO] = useState(() => formatarDataISO(new Date()));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const atualizar = () => {
      clearTimeout(timer);
      const agora = new Date();
      setHojeISO(formatarDataISO(agora));
      // Calendário local: o próximo dia pode ter 23 ou 25 horas.
      const proximoDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);
      timer = setTimeout(atualizar, Math.max(1, proximoDia.getTime() - agora.getTime()));
    };
    const retomar = () => { if (document.visibilityState === "visible") atualizar(); };
    atualizar();
    document.addEventListener("visibilitychange", retomar);
    window.addEventListener("focus", atualizar);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", retomar);
      window.removeEventListener("focus", atualizar);
    };
  }, []);

  const filtrosSalvos = useGanttStore((s) => s.filtrosSalvos);

  const [prevFiltrosSalvos, setPrevFiltrosSalvos] = useState(filtrosSalvos);
  const [filtros, setFiltros] = useState<GanttFiltrosAvancados>(() => filtrosSalvos || {});

  if (filtrosSalvos !== prevFiltrosSalvos) {
    setPrevFiltrosSalvos(filtrosSalvos);
    if (filtrosSalvos) {
      setFiltros(filtrosSalvos);
    }
  }

  const atualizarFiltros = useCallback(
    (atualizacao: SetStateAction<GanttFiltrosAvancados>) => {
      if (podeUsarInterface && !podeUsarInterface()) return;
      setFiltros(atualizacao);
    },
    [podeUsarInterface]
  );


  const totalFiltrosAtivos = useMemo(() => {
    return [
      filtros.termoBusca,
      filtros.categoria,
      filtros.instaladorId,
      filtros.statusObra,
      filtros.prioridade !== undefined,
      filtros.responsavel,
      filtros.dataInicioDe,
      filtros.dataInicioAte,
      filtros.dataFimDe,
      filtros.dataFimAte,
      filtros.statusMaterial && filtros.statusMaterial !== "todos",
      filtros.apenasAtrasadas,
    ].filter(Boolean).length;
  }, [filtros]);

  const programacoesFiltradas = useMemo(() => {
    if (!programacoes) return [];
    let lista = programacoes;

    // 1. Equipe
    if (filtros.instaladorId) {
      lista = lista.filter((p) => p.equipe?.integrantes.some(i => i.usuarioId === filtros.instaladorId));
    }

    // 2. Período de Início
    if (filtros.dataInicioDe) {
      lista = lista.filter((p) => p.dataInicio >= filtros.dataInicioDe!);
    }
    if (filtros.dataInicioAte) {
      lista = lista.filter((p) => p.dataInicio <= filtros.dataInicioAte!);
    }

    // 3. Período de Término
    if (filtros.dataFimDe) {
      lista = lista.filter((p) => p.dataFim >= filtros.dataFimDe!);
    }
    if (filtros.dataFimAte) {
      lista = lista.filter((p) => p.dataFim <= filtros.dataFimAte!);
    }

    // 4. Prioridade
    if (filtros.prioridade !== undefined) {
      lista = lista.filter((p) => p.prioridade === filtros.prioridade);
    }

    // 5. Termo de Busca (Texto livre)
    if (filtros.termoBusca?.trim()) {
      const termo = filtros.termoBusca.toLowerCase().trim();
      lista = lista.filter((p) => {
        const obra = obras?.find((o) => Number(o.id) === Number(p.obraId));

        return (
          Boolean(obra?.clienteNome?.toLowerCase().includes(termo)) ||
          String(p.obraId).includes(termo) ||
          String(p.id).includes(termo) ||
          Boolean(obra?.categoria?.toLowerCase().includes(termo)) ||
          Boolean(p.equipe?.integrantes.some(i => i.nome.toLowerCase().includes(termo)))
        );
      });
    }

    // 6. Categoria da Obra
    if (filtros.categoria) {
      lista = lista.filter((p) => {
        const obra = obras?.find((o) => Number(o.id) === Number(p.obraId));
        return obra?.categoria === filtros.categoria;
      });
    }

    // 7. Status da Obra no Funil
    if (filtros.statusObra) {
      lista = lista.filter((p) => {
        const obra = obras?.find((o) => Number(o.id) === Number(p.obraId));
        return obra?.status === filtros.statusObra;
      });
    }

    // 8. Responsável pela Atualização
    if (filtros.responsavel?.trim()) {
      const respTermo = filtros.responsavel.toLowerCase().trim();
      lista = lista.filter((p) => {
        const obra = obras?.find((o) => Number(o.id) === Number(p.obraId));
        return Boolean(obra?.atualizadoPor?.toLowerCase().includes(respTermo));
      });
    }

    // 9. Prontidão dos Materiais
    if (filtros.statusMaterial && filtros.statusMaterial !== "todos") {
      lista = lista.filter((p) => {
        const obra = obras?.find((o) => Number(o.id) === Number(p.obraId));
        const pronto = materialEstaPronto(obra?.status);
        return filtros.statusMaterial === "pronto" ? pronto : !pronto;
      });
    }

    // 10. Checkbox: Apenas Tarefas Atrasadas
    if (filtros.apenasAtrasadas) {
      lista = lista.filter((p) => {
        const obra = obras?.find((o) => Number(o.id) === Number(p.obraId));
        return p.dataFim < hojeISO && obra?.status !== "Concluido";
      });
    }

    return lista;
  }, [
    hojeISO,
    programacoes,
    filtros,
    obras,
    ]);

  return {
    hojeISO,
    filtros,
    setFiltros: atualizarFiltros,
    atualizarFiltros,
    totalFiltrosAtivos,
    programacoesFiltradas,
  };
}
