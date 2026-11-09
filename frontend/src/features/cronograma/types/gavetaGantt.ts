import type { Programacao } from "@/shared/types/programacoes";

/**
 * Fase do ciclo de submissão do reagendamento via gaveta.
 */
export type FaseReagendamento = "livre" | "salvando" | "sincronizando" | "recuperacao";

/**
 * Contrato canônico simplificado de equipe disponível para seleção na gaveta.
 */
export interface EquipeOpcao {
  id: number;
  nome: string;
}

/**
 * Projeção neutra e desacoplada dos dados de alocação consumidos pela gaveta de tarefas.
 * Não depende de DTOs privados de outras features (como ObraCard ou DadosHomologacao).
 */
export interface TarefaAlocacaoBase {
  id: number;
  obraId: number;
  equipeId: number;
  nomeEquipe: string;
  nomeCliente: string;
  dataInicio: string;
  dataFim: string;
  duracaoDias: number;
  paineis?: number;
}

/**
 * Propriedades do formulário acessível de reagendamento da data inicial.
 */
export interface FormularioReagendamentoProps {
  tarefaId: number;
  dataInicio: string;
  canEdit: boolean;
  onCancelar: () => void;
  onReagendar?: (id: number, novaDataInicio: string) => Promise<boolean | null>;
  reagendamentoBloqueado?: boolean;
  reagendamentoFase?: FaseReagendamento;
  avisoReagendamento?: string | null;
}

/**
 * Propriedades puramente visuais do painel de prontidão operacional.
 * Recebe dados desidratados e derivados, sem criar dependência direta com hooks de obras.
 */
export interface PainelProntidaoProps {
  materialStatus?: string | null;
  carregandoHomologacao?: boolean;
  parecerHomologacao?: string | null;
  registroTecnico?: string | null;
  prazoVistoria?: string | null;
}

/**
 * Propriedades do seletor de reatribuição rápida de equipe com verificação de conflitos.
 */
export interface ReatribuicaoEquipeProps {
  tarefaId: number;
  equipeId: number;
  dataInicio: string;
  dataFim: string;
  equipes?: EquipeOpcao[];
  programacoes?: Programacao[];
  onMudarEquipe?: (id: number, novaEquipeId: number) => Promise<void>;
  canEdit?: boolean;
}
