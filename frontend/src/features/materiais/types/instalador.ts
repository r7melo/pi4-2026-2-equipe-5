// Tipos do domínio de Instalações e Manutenções para o perfil Instalador de Campo (RF-05, RF-06, RF-19, RN-04, RF-26)
// Espelhados 1:1 com o Contrato de API (Rotas #37 a #41 de 07-api.md)

export type {
  StatusManutencao,
  ManutencaoInstalador,
  ConcluirManutencaoPayload,
  ManutencaoConcluidaResposta,
  CriarComentarioManutencaoPayload,
  ComentarioManutencaoResposta,
} from "@/shared/types/instalador";

export interface InstalacaoItemResumo {
  obraId: number;
  clienteNome: string;
  endereco: string;
  status: string;
  dataInicio: string;
  dataFim: string;
  equipeNome?: string;
}

export interface KitItemInstalacao {
  tipo: string;
  quantidade: number;
}

export interface InstalacaoDetalhe {
  obraId: number;
  clienteNome: string;
  clienteTelefone?: string;
  endereco: string;
  linkNavegacao?: string;
  kit: KitItemInstalacao[];
  projeto?: { arquivo?: string | null };
  instrucoes?: string | null;
  dataInicio?: string;
  dataFim?: string;
  equipeNome?: string;
}
