import { CampoSenha } from "./CampoSenha";
import { requisitosSenha } from "../lib/politicaSenha";
import type { CamposNovaSenhaProps } from "@/types";

export function CamposNovaSenha({ nova, confirmar, onNova, onConfirmar, disabled }: CamposNovaSenhaProps) {
  return <>
    <CampoSenha id="nova-senha" label="Nova senha" value={nova} onChange={onNova} disabled={disabled} />
    <ul aria-label="Requisitos da nova senha" className="space-y-1 text-sm text-foreground-secondary">
      {requisitosSenha(nova).map(item => <li key={item.texto}>
        <span aria-hidden="true">{item.atende ? "✓ " : "○ "}</span>{item.texto}<span className="sr-only">{item.atende ? ": atendido" : ": não atendido"}</span>
      </li>)}
    </ul>
    <CampoSenha id="confirmar-senha" label="Confirmar nova senha" value={confirmar} onChange={onConfirmar} disabled={disabled} />
    {confirmar && nova !== confirmar && <p role="status" className="text-sm text-destructive">As senhas não coincidem.</p>}
  </>;
}
