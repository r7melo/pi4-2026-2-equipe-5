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
import { useState, useEffect } from "react";

const STORAGE_KEY = "zl_api_mode";

export type ApiMode = "real" | "mock";

/** Lê o modo atual do localStorage (padrão: "mock" se VITE_USE_MOCK=true, senão "real") */
export function getApiMode(): ApiMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "real" || stored === "mock") return stored;
  } catch {
    // localStorage indisponível (SSR / incognito restrito)
  }
  // Fallback para o valor definido em build-time
  return import.meta.env.VITE_USE_MOCK === "true" ? "mock" : "real";
}

export function ApiModeSwitcher() {
  // Só renderiza em dev
  if (!import.meta.env.DEV) return null;

  return <ApiModeSwitcherInner />;
}

function ApiModeSwitcherInner() {
  const [mode, setMode] = useState<ApiMode>(getApiMode);
  const [open, setOpen] = useState(false);
  const [reloading, setReloading] = useState(false);

  // Sincroniza se outra aba mudar
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === "real" || e.newValue === "mock")) {
        setMode(e.newValue);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  function switchMode(next: ApiMode) {
    if (next === mode) {
      setOpen(false);
      return;
    }
    setReloading(true);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* noop */
    }
    // Pequeno delay visual antes de recarregar
    setTimeout(() => window.location.reload(), 300);
  }

  const isMock = mode === "mock";

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setOpen((o) => !o)}
        title={`API: ${isMock ? "Mock" : "Real"} — clique para trocar`}
        className={[
          "fixed bottom-4 right-4 z-[9999]",
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
          "text-xs font-semibold shadow-lg border",
          "transition-all duration-150 select-none",
          isMock
            ? "bg-amber-400 border-amber-500 text-amber-900 hover:bg-amber-300"
            : "bg-emerald-500 border-emerald-600 text-white hover:bg-emerald-400",
          reloading ? "opacity-50 cursor-wait" : "cursor-pointer",
        ].join(" ")}
        disabled={reloading}
        aria-label="Alternar modo de API"
      >
        {/* Indicador colorido */}
        <span
          className={[
            "inline-block w-2 h-2 rounded-full",
            isMock ? "bg-amber-700" : "bg-emerald-100",
          ].join(" ")}
        />
        {isMock ? "🚧 Mock" : "🌐 API Real"}
        <span className="opacity-60">{open ? "▲" : "▼"}</span>
      </button>

      {/* Popup */}
      {open && !reloading && (
        <div
          className={[
            "fixed bottom-14 right-4 z-[9999]",
            "w-56 rounded-xl shadow-2xl border",
            "bg-white dark:bg-zinc-900",
            "border-zinc-200 dark:border-zinc-700",
            "p-3 flex flex-col gap-2",
          ].join(" ")}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">
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

          <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-1 leading-tight">
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
      ? "ring-amber-400 bg-amber-50 dark:bg-amber-950/40"
      : "ring-emerald-500 bg-emerald-50 dark:bg-emerald-950/40";
  const dot = color === "amber" ? "bg-amber-400" : "bg-emerald-500";

  return (
    <button
      onClick={onClick}
      className={[
        "w-full text-left px-3 py-2 rounded-lg border text-sm transition-all",
        active
          ? `ring-2 ${ring} border-transparent font-semibold`
          : "border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
        <span className="text-zinc-800 dark:text-zinc-100">{label}</span>
        {active && (
          <span className="ml-auto text-[10px] text-zinc-400 dark:text-zinc-500">ativo</span>
        )}
      </div>
      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 pl-4 leading-tight">
        {description}
      </p>
    </button>
  );
}
