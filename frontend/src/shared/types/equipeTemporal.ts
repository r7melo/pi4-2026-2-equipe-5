export interface IntegranteTemporal {
  usuarioId: number;
  nome: string;
  dataEntrada: string;
  dataSaida: string;
}
export interface EquipeTemporal {
  pessoasPrevistas: number;
  pessoasAlocadas: number;
  pessoasFaltantes: number;
  pessoaDia: number;
  integrantes: IntegranteTemporal[];
}
export interface DisponibilidadeInstalador {
  usuarioId: number;
  nome: string;
  ocupado: boolean;
  ocupacoes: { obraId: number; dataInicio: string; dataFim: string }[];
}
export interface OcupacaoGantt {
  porDia: { data: string; instaladoresAtivos: number; alocados: number; livres: number; faltantes: number }[];
  porInstalador: { usuarioId: number; nome: string; diasUteis: number; diasAlocados: number; ocupacaoPercentual: number }[];
}
export type AlteracaoEquipeTemporal =
  | { tipo: 'previstas'; pessoasPrevistas: number }
  | { tipo: 'incluir'; usuarioId: number; dataEntrada: string; dataSaida: string }
  | { tipo: 'datas'; usuarioId: number; dataEntrada: string; dataSaida: string }
  | { tipo: 'remover'; usuarioId: number; dataSaida?: string };
