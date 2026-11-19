import type { UseQueryResult } from "@tanstack/react-query";
import type { FiltrosUsuarios, UsuarioItem, UsuariosResposta } from "./gestaoUsuarios";

export type DialogoUsuario = null | { tipo: "cadastro" } | { tipo: "edicao" | "status"; usuario: UsuarioItem };

export interface ControlesUsuariosProps {
  busca: string;
  filtros: FiltrosUsuarios;
  filtrado: boolean;
  aoBuscar: (busca: string) => void;
  aoPerfil: (perfil: FiltrosUsuarios["perfil"]) => void;
  aoStatus: (ativo: FiltrosUsuarios["ativo"]) => void;
  aoLimpar: () => void;
}

export interface ListaUsuariosProps {
  lista: UseQueryResult<UsuariosResposta, Error>;
  filtros: FiltrosUsuarios;
  filtrado: boolean;
  usuarioId: number;
  aoLimpar: () => void;
  aoPagina: (pagina: number) => void;
  aoEditar: (usuario: UsuarioItem, origem: HTMLElement) => void;
  aoStatus: (usuario: UsuarioItem, origem: HTMLElement) => void;
}
