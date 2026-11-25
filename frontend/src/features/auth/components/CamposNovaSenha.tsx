import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { CampoSenha } from "./CampoSenha";
import { requisitosSenha, senhaValida } from "../lib/politicaSenha";
import type { CamposNovaSenhaProps } from "../types/senha";

function calcularForca(nova: string, requisitos: ReturnType<typeof requisitosSenha>) {
  if (!nova) return { pontos: 0, texto: "Aguardando digitação", corBarra: "bg-muted", corTexto: "text-muted-foreground" };
  const principais = requisitos.slice(0, 4).filter(r => r.atende).length;
  if (principais <= 1) return { pontos: 1, texto: "Fraca", corBarra: "bg-destructive", corTexto: "text-destructive" };
  if (principais === 2) return { pontos: 2, texto: "Regular", corBarra: "bg-warning", corTexto: "text-warning" };
  if (principais === 3) return { pontos: 3, texto: "Boa", corBarra: "bg-info", corTexto: "text-info" };
  return { pontos: 4, texto: "Forte", corBarra: "bg-success", corTexto: "text-success" };
}

export function CamposNovaSenha({ nova, confirmar, onNova, onConfirmar, disabled, validar = false, erroNova }: CamposNovaSenhaProps) {
  const [visitado, setVisitado] = useState(false);
  const erroConfirmar = (validar || visitado) && nova !== confirmar;
  const requisitos = requisitosSenha(nova);
  const forca = calcularForca(nova, requisitos);

  return (
    <>
      <div className="space-y-2">
        <CampoSenha
          id="nova-senha"
          erro={(validar && !senhaValida(nova)) || Boolean(erroNova)}
          descricaoId={erroNova ? "requisitos-nova-senha erro-nova-senha" : "requisitos-nova-senha"}
          label="Nova senha"
          placeholder="Digite a nova senha"
          enterKeyHint="next"
          value={nova}
          onChange={onNova}
          disabled={disabled}
        />
        {erroNova && <p id="erro-nova-senha" className="text-xs text-destructive">{erroNova}</p>}

        <div className="pt-1 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">Força da senha</span>
            <span className={cn("font-medium", forca.corTexto)}>{forca.texto}</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
            {[0, 1, 2, 3].map(idx => (
              <div
                key={idx}
                className={cn(
                  "h-1.5 rounded-full transition-colors",
                  idx < forca.pontos ? forca.corBarra : "bg-muted"
                )}
              />
            ))}
          </div>
          <ul id="requisitos-nova-senha" aria-label="Requisitos da nova senha" className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs pt-0.5">
            {requisitos.map(item => (
              <li
                key={item.texto}
                className={cn(
                  "flex items-center gap-1.5",
                  item.atende ? "text-success font-medium" : "text-muted-foreground"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "w-3.5 h-3.5 rounded-full border inline-flex items-center justify-center shrink-0",
                    item.atende ? "border-success bg-success text-primary-foreground" : "border-border-strong"
                  )}
                >
                  {item.atende && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                </span>
                <span>{item.texto}</span>
                <span className="sr-only">{item.atende ? ": atendido" : ": não atendido"}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <CampoSenha
        id="confirmar-senha"
        erro={erroConfirmar}
        descricaoId={erroConfirmar ? "senhas-divergentes" : undefined}
        onBlur={() => setVisitado(true)}
        label="Confirmar nova senha"
        placeholder="Repita a nova senha"
        enterKeyHint="done"
        value={confirmar}
        onChange={onConfirmar}
        disabled={disabled}
      />
      {erroConfirmar && <p id="senhas-divergentes" className="text-xs text-destructive">As senhas não coincidem.</p>}
    </>
  );
}
