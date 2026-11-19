import { useState } from "react";
import { CampoSenha } from "./CampoSenha";
import { requisitosSenha, senhaValida } from "../lib/politicaSenha";
import type { CamposNovaSenhaProps } from "../types/senha";

export function CamposNovaSenha({ nova, confirmar, onNova, onConfirmar, disabled, validar = false, erroNova }: CamposNovaSenhaProps) {
  const [visitado, setVisitado] = useState(false);
  const erroConfirmar = (validar || visitado) && nova !== confirmar;
  return <>
    <ul id="requisitos-nova-senha" aria-label="Requisitos da nova senha" className="space-y-1 text-sm text-foreground-secondary">
      {requisitosSenha(nova).map(item => <li key={item.texto}>
        <span aria-hidden="true">{item.atende ? "✓ " : "○ "}</span>{item.texto}<span className="sr-only">{item.atende ? ": atendido" : ": não atendido"}</span>
      </li>)}
    </ul>
    <CampoSenha id="nova-senha" erro={(validar && !senhaValida(nova)) || Boolean(erroNova)} descricaoId={erroNova ? "requisitos-nova-senha erro-nova-senha" : "requisitos-nova-senha"} label="Nova senha" value={nova} onChange={onNova} disabled={disabled} />
    {erroNova && <p id="erro-nova-senha" className="text-sm text-destructive">{erroNova}</p>}
    <CampoSenha id="confirmar-senha" erro={erroConfirmar} descricaoId={erroConfirmar ? "senhas-divergentes" : undefined} onBlur={() => setVisitado(true)} label="Confirmar nova senha" value={confirmar} onChange={onConfirmar} disabled={disabled} />
    {erroConfirmar && <p id="senhas-divergentes" className="text-sm text-destructive">As senhas não coincidem.</p>}
  </>;
}
