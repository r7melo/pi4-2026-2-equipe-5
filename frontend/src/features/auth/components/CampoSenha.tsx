import { useState } from "react";
import { BotaoVisibilidadeSenha } from "@/shared/components/ui/BotaoVisibilidadeSenha";
import type { CampoSenhaProps } from "../types/senha";

export function CampoSenha({ id, label, value, onChange, disabled, descricaoId, erro = false, onBlur, autoComplete = "new-password" }: CampoSenhaProps) {
  const [visivel, setVisivel] = useState(false);
  return <div className="space-y-2">
    <label htmlFor={id} className="block text-sm font-medium text-foreground">{label}</label>
    <div className="relative">
      <input id={id} name={id} aria-describedby={descricaoId} aria-invalid={erro} onBlur={onBlur} type={visivel ? "text" : "password"} value={value} disabled={disabled} required
        autoComplete={autoComplete} onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-border-strong bg-surface px-3 py-3 pr-14 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
      <BotaoVisibilidadeSenha
        visivel={visivel}
        onAlternar={() => setVisivel(v => !v)}
        disabled={disabled}
        rotuloMostrar={`Mostrar ${label.toLowerCase()}`}
        rotuloOcultar={`Ocultar ${label.toLowerCase()}`}
      />
    </div>
  </div>;
}
