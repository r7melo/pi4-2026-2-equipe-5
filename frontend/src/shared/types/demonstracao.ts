import type { ComponentType, ReactNode } from "react";
export interface AmbienteAplicacaoProps { children: ReactNode; }
export interface AplicacaoProps { ambiente?: ComponentType<AmbienteAplicacaoProps>; }
export interface FiltrosRelatorioDemonstracao { periodoInicio: string; periodoFim: string; clienteFiltro: string; }

declare module "axios" {
  interface AxiosRequestConfig { geracaoDemonstracao?: string; }
}
