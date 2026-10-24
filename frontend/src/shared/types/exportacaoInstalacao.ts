export type FormatoExportacaoInstalacao = "pdf" | "xlsx";
export type GrupoDadoAusente = "materiais" | "endereco" | "equipes" | "periodos" | "observacoes";
export interface FaltanteInstalacao {
  grupo: GrupoDadoAusente;
  programacaoId?: number;
}
export interface MaterialInstalacaoProjetado {
  id: number;
  nome: string | null;
  quantidade: number | null;
  unidade: string | null;
}
export interface ProgramacaoInstalacaoProjetada {
  id: number;
  equipeId: number | null;
  nomeEquipe: string | null;
  dataInicio: string | null;
  dataFim: string | null;
}
export interface DadosInstalacao {
  obraId: number;
  tituloObra: string;
  clienteNome: string;
  endereco: string | null;
  observacoesTecnicas: string | null;
  materiais: MaterialInstalacaoProjetado[];
  programacoes: ProgramacaoInstalacaoProjetada[];
}
