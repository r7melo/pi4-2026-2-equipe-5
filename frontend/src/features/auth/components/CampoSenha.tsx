import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { CampoSenhaProps } from "@/types";

export function CampoSenha({ id, label, value, onChange, disabled, autoComplete = "new-password" }: CampoSenhaProps) {
  const [visivel, setVisivel] = useState(false);
  return <div className="space-y-2">
    <label htmlFor={id} className="block text-sm font-medium text-foreground">{label}</label>
    <div className="relative">
      <input id={id} type={visivel ? "text" : "password"} value={value} disabled={disabled} required
        autoComplete={autoComplete} onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-border-strong bg-surface px-3 py-3 pr-14 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
      <button type="button" disabled={disabled} aria-label={`${visivel ? "Ocultar" : "Mostrar"} ${label.toLowerCase()}`}
        aria-pressed={visivel} onClick={() => setVisivel(v => !v)}
        className="absolute right-1 top-1 h-10 w-10 flex items-center justify-center rounded text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        {visivel ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
      </button>
    </div>
  </div>;
}
