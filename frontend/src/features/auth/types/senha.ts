import type { ReactNode } from "react";

export interface SolicitarSenhaEntrada { email: string }
export interface RedefinirSenhaEntrada { token: string; novaSenha: string }
export interface AlterarSenhaEntrada { senhaAtual: string; novaSenha: string }
export interface MensagemSenha { mensagem: string; sucesso?: boolean }
export interface ContextoPedidoSenha { signal: AbortSignal; sessao?: number }
export interface CampoSenhaProps {
  id: string; label: string; value: string; onChange: (valor: string) => void;
  disabled?: boolean; autoComplete?: "current-password" | "new-password";
}
export interface CamposNovaSenhaProps {
  nova: string; confirmar: string; onNova: (valor: string) => void;
  onConfirmar: (valor: string) => void; disabled?: boolean;
}
export interface PaginaAcessoProps { titulo: string; children: ReactNode }
