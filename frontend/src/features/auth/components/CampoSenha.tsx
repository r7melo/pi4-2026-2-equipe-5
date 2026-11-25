import { useState } from "react";
import { BotaoVisibilidadeSenha } from "@/shared/components/ui/BotaoVisibilidadeSenha";
import type { CampoSenhaProps } from "../types/senha";

export function CampoSenha({
  id,
  label,
  value,
  onChange,
  disabled,
  descricaoId,
  erro = false,
  onBlur,
  autoComplete = "new-password",
  placeholder,
  enterKeyHint,
}: CampoSenhaProps) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-foreground-secondary">{label}</label>
      <div className="relative flex items-center">
        <input
          id={id}
          name={id}
          aria-describedby={descricaoId}
          aria-invalid={erro}
          onBlur={onBlur}
          type={visivel ? "text" : "password"}
          value={value}
          disabled={disabled}
          required
          autoComplete={autoComplete}
          placeholder={placeholder}
          enterKeyHint={enterKeyHint}
          onChange={e => onChange(e.target.value)}
          className="w-full h-11 rounded-lg border border-border-strong bg-surface-subtle px-3.5 pr-14 text-sm text-foreground placeholder:text-muted-foreground focus:bg-surface aria-invalid:border-destructive user-invalid:border-destructive transition-colors"
        />
        <BotaoVisibilidadeSenha
          visivel={visivel}
          onAlternar={() => setVisivel(v => !v)}
          disabled={disabled}
          rotuloMostrar={`Mostrar ${label.toLowerCase()}`}
          rotuloOcultar={`Ocultar ${label.toLowerCase()}`}
        />
      </div>
    </div>
  );
}
