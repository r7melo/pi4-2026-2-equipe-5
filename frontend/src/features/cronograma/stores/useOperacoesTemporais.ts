import { create } from 'zustand';

type FaseOperacao = 'livre' | 'enviando' | 'incerta';
interface EstadoOperacoesTemporais {
  sessao: number;
  fases: Record<string, FaseOperacao>;
  reservar: (sessao: number, chave: string) => boolean;
  marcar: (sessao: number, chave: string, fase: FaseOperacao) => void;
  confirmarConsulta: (sessao: number) => void;
}

/** Uma resposta perdida continua bloqueada depois de fechar overlays ou trocar de rota. */
export const useOperacoesTemporais = create<EstadoOperacoesTemporais>((set, get) => ({
  sessao: -1, fases: {},
  reservar: (sessao, chave) => {
    const atual = get();
    if (atual.sessao === sessao && Object.values(atual.fases).some(f => f !== 'livre')) return false;
    set({ sessao, fases: { ...(atual.sessao === sessao ? atual.fases : {}), [chave]: 'enviando' } });
    return true;
  },
  marcar: (sessao, chave, fase) => {
    if (get().sessao !== sessao) return;
    set(s => ({ fases: { ...s.fases, [chave]: fase } }));
  },
  confirmarConsulta: sessao => {
    if (get().sessao === sessao) set({ fases: {} });
  },
}));
