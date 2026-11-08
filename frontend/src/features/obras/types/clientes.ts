import type { ObraCard } from "./obras";
export interface ClienteCadastro { id: number; nome: string; cidade: string; endereco: string; }
export type ObraCadastrada = ObraCard & { clienteId: number };
