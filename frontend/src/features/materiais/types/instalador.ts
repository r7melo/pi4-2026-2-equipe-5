// Tipos do domínio de Instalações para o perfil Instalador de Campo (RF-06, RF-16, RN-04, RN-07)
// Espelhados 1:1 com o Contrato de API (Rotas #37 e #38 de 07-api.md) e BancoDados.Instalacoes.cs

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
