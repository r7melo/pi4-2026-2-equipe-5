export interface CoordenadasScrollGantt {
  x: number;
  y: number;
}

export interface EstadoVisualGantt {
  arvore: Record<string, boolean>;
  scrollOperacao: CoordenadasScrollGantt;
  scrollDisplay: CoordenadasScrollGantt;
  dataCivilVisivel: string | null;
  ultimoMenorInicio: string | null;
}

export function criarEstadoVisualInicial(): EstadoVisualGantt {
  return {
    arvore: {},
    scrollOperacao: { x: 0, y: 0 },
    scrollDisplay: { x: 0, y: 0 },
    dataCivilVisivel: null,
    ultimoMenorInicio: null,
  };
}

export function clonarEstadoVisual(estado: EstadoVisualGantt): EstadoVisualGantt {
  return {
    arvore: { ...estado.arvore },
    scrollOperacao: { ...estado.scrollOperacao },
    scrollDisplay: { ...estado.scrollDisplay },
    dataCivilVisivel: estado.dataCivilVisivel,
    ultimoMenorInicio: estado.ultimoMenorInicio,
  };
}

export interface ArmazenamentoEstadoVisualGantt {
  readonly sessao: number;
  obterEstadoVisual: () => EstadoVisualGantt;
  salvarEstadoVisual: (novoEstado: EstadoVisualGantt) => void;
}

export class ArmazenadorEstadoVisualGantt implements ArmazenamentoEstadoVisualGantt {
  readonly sessao: number;
  private estado: EstadoVisualGantt;

  constructor(sessao: number) {
    this.sessao = sessao;
    this.estado = criarEstadoVisualInicial();
  }

  obterEstadoVisual = (): EstadoVisualGantt => {
    return clonarEstadoVisual(this.estado);
  };

  salvarEstadoVisual = (novoEstado: EstadoVisualGantt): void => {
    this.estado = clonarEstadoVisual(novoEstado);
  };

}

export function criarArmazenamentoEstadoVisual(
  sessao: number
): ArmazenamentoEstadoVisualGantt {
  return new ArmazenadorEstadoVisualGantt(sessao);
}
