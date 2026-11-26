import { MOCK_ATIVO } from "@/shared/lib/modoApi";
/**
 * ApiModeSwitcher — Popup de desenvolvimento (canto inferior direito)
 *
 * Permite alternar em runtime entre a API real e o mock local.
 * Persiste a escolha em localStorage e recarrega a página para aplicar.
 *
 * SOMENTE DESENVOLVIMENTO:
 *   - Renderiza apenas quando import.meta.env.DEV === true.
 *   - Em produção (npm run build / NODE_ENV=production), o Vite substitui
 *     import.meta.env.DEV por `false` e o tree-shaker elimina todo o código
 *     deste módulo do bundle final. Nenhum byte deste componente chega ao
 *     usuário em produção.
 */
import { useState, useId, useRef } from "react";
import { FlaskConical, Globe } from "lucide-react";

const STORAGE_KEY = "zl_api_mode";

export type ApiMode = "real" | "mock";


export function ApiModeSwitcher() {
  // Só renderiza em dev
  if (!import.meta.env.DEV) return null;

  return <ApiModeSwitcherInner />;
}

function ApiModeSwitcherInner() {
  const painelId = useId();
  const tituloId = useId();
  const acionadorRef = useRef<HTMLButtonElement>(null);
  // Mesma decisão de bootstrap que instala o transporte e seleciona a sessão.
  const mode: ApiMode = MOCK_ATIVO ? "mock" : "real";
  const [open, setOpen] = useState(false);
  const [reloading, setReloading] = useState(false);

  function switchMode(next: ApiMode) {
    if (next === mode) {
      acionadorRef.current?.focus();
      setOpen(false);
      return;
    }
    setReloading(true);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* noop */
    }
    window.location.reload();
  }

  const isMock = mode === "mock";

  return (
    <>
      {/* Botão flutuante */}
      <button
        type="button"
        ref={acionadorRef}
        aria-expanded={open}
        aria-controls={open ? painelId : undefined}
        onClick={() => setOpen((o) => !o)}
        title={`API: ${isMock ? "Mock" : "Real"} — clique para trocar`}
        className={[
          "fixed bottom-4 right-4 z-[9999]",
          "w-9 h-9 inline-flex items-center justify-center rounded-full",
          "shadow-lg border transition-colors select-none",
          isMock
            ? "bg-warning-light border-warning text-warning"
            : "bg-success-light border-success text-success",
          reloading ? "opacity-50 cursor-wait" : "cursor-pointer",
        ].join(" ")}
        disabled={reloading}
        aria-label={`Alternar modo de API: ${isMock ? "Mock" : "API Real"}`}
      >
        {isMock ? (
          <FlaskConical className="w-4 h-4" aria-hidden="true" />
        ) : (
          <Globe className="w-4 h-4" aria-hidden="true" />
        )}
      </button>

      {/* Popup */}
      {open && !reloading && (
        <div
          id={painelId}
          role="group"
          aria-labelledby={tituloId}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              setOpen(false);
              acionadorRef.current?.focus();
            }
          }}
          className={[
            "fixed bottom-14 right-4 z-[9999]",
            "w-56 rounded-xl shadow-2xl border",
            "bg-surface",
            "border-border-strong",
            "p-3 flex flex-col gap-2",
          ].join(" ")}
        >
          <p id={tituloId} className="text-[11px] font-bold uppercase tracking-wider text-foreground-secondary mb-1">
            Modo de API
          </p>

          <ModeOption
            active={mode === "mock"}
            onClick={() => switchMode("mock")}
            color="amber"
            label="🚧 Mock"
            description="Backend simulado local (sem servidor)"
          />

          <ModeOption
            active={mode === "real"}
            onClick={() => switchMode("real")}
            color="emerald"
            label="🌐 API Real"
            description={`Conecta em ${import.meta.env.VITE_API_URL || "http://localhost:8000"}`}
          />

          <p className="text-[10px] text-foreground-secondary mt-1 leading-tight">
            A página será recarregada ao trocar.
          </p>
        </div>
      )}
    </>
  );
}

interface ModeOptionProps {
  active: boolean;
  onClick: () => void;
  color: "amber" | "emerald";
  label: string;
  description: string;
}

function ModeOption({ active, onClick, color, label, description }: ModeOptionProps) {
  const ring =
    color === "amber"
      ? "border-warning bg-warning-light"
      : "border-success bg-success-light";
  const dot = color === "amber" ? "bg-warning" : "bg-success";

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        "w-full text-left px-3 py-2 rounded-lg border text-sm",
        active
          ? `${ring} font-semibold`
          : "border-border-strong hover:bg-surface-subtle",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
        <span className="text-foreground">{label}</span>
        {active && (
          <span aria-hidden="true" className="ml-auto text-[10px] text-foreground-secondary">ativo</span>
        )}
      </div>
      <p className="text-[11px] text-foreground-secondary mt-0.5 pl-4 leading-tight">
        {description}
      </p>
    </button>
  );
}
