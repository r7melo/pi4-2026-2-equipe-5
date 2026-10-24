import { useState, useRef, useEffect } from "react";
import { Download, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { ConfirmDialog } from "@/shared/components/feedback/ConfirmDialog";
import { useExportarInstalacao } from "../hooks/useExportarInstalacao";
import type { ExportarDetalhesInstalacaoProps } from "../types/exportacaoInstalacao";
import { descreverFaltanteInstalacao } from "@/shared/lib/instalacao";

export function ExportarDetalhesInstalacao({ obraId, contextoValido, sinalContexto }: ExportarDetalhesInstalacaoProps) {
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const itemRetryRef = useRef<HTMLButtonElement>(null);
  const itemPdfRef = useRef<HTMLButtonElement>(null);
  const itemXlsxRef = useRef<HTMLButtonElement>(null);

  const { estado, iniciar, confirmarParcial, cancelar, tentarNovamente } = useExportarInstalacao(obraId, contextoValido, sinalContexto);

  const estaOcupado = estado.fase === "verificando" || estado.fase === "gerando";

  // Fecha ao clicar/tocar fora do menu (em fase de captura para preceder o stopPropagation do Drawer)
  useEffect(() => {
    if (!menuAberto) return;
    const fechar = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuAberto(false);
      }
    };
    window.addEventListener("pointerdown", fechar, true);
    return () => window.removeEventListener("pointerdown", fechar, true);
  }, [menuAberto]);

  // Foco inicial no primeiro item do menu ao abrir (retry se houver erro, ou PDF)
  useEffect(() => {
    if (menuAberto) {
      (itemRetryRef.current || itemPdfRef.current)?.focus();
    }
  }, [menuAberto]);

  // Navegação WAI-ARIA por teclado no menu e captura de Escape/Tab
  useEffect(() => {
    if (!menuAberto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        setMenuAberto(false);
        btnRef.current?.focus();
        return;
      }

      if (e.key === "Tab") {
        setMenuAberto(false);
        return;
      }

      const itens = [itemRetryRef.current, itemPdfRef.current, itemXlsxRef.current].filter(
        (el): el is HTMLButtonElement => Boolean(el)
      );
      if (itens.length === 0) return;

      const idxAtual = itens.indexOf(document.activeElement as HTMLButtonElement);

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const prox = idxAtual === -1 || idxAtual === itens.length - 1 ? 0 : idxAtual + 1;
        itens[prox]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const ant = idxAtual <= 0 ? itens.length - 1 : idxAtual - 1;
        itens[ant]?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        itens[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        itens[itens.length - 1]?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [menuAberto]);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <Button
        ref={btnRef}
        variant="outline"
        size="sm"
        disabled={estaOcupado}
        onClick={() => setMenuAberto((aberto) => !aberto)}
        aria-haspopup="menu"
        aria-expanded={menuAberto}
        aria-label="Exportar detalhes da instalação"
        title="Exportar detalhes da instalação"
        className="h-8 px-2.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
      >
        {estaOcupado ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline">Exportar</span>
      </Button>

      {menuAberto && (
        <div
          role="menu"
          aria-label="Opções de exportação"
          aria-orientation="vertical"
          className="absolute right-0 mt-1 w-48 rounded-lg bg-surface border border-border-subtle shadow-xl z-[70] py-1 text-xs"
        >
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-b border-border-subtle/60 select-none">
            Exporta os dados salvos da obra
          </div>
          {estado.fase === "erro" && (
            <button
              ref={itemRetryRef}
              role="menuitem"
              tabIndex={-1}
              type="button"
              className="w-full flex items-center justify-between px-3 py-2 text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:outline-hidden transition-colors cursor-pointer text-left font-medium border-b border-border-subtle/60"
              onClick={() => {
                setMenuAberto(false);
                btnRef.current?.focus();
                void tentarNovamente();
              }}
            >
              <span>Tentar novamente</span>
              <span className="text-[10px] uppercase font-bold">{estado.formato}</span>
            </button>
          )}
          <button
            ref={itemPdfRef}
            role="menuitem"
            tabIndex={-1}
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 text-foreground-secondary hover:bg-surface-subtle focus:bg-surface-subtle focus:outline-hidden transition-colors cursor-pointer text-left"
            onClick={() => {
              setMenuAberto(false);
              btnRef.current?.focus();
              void iniciar("pdf");
            }}
          >
            <FileText className="w-3.5 h-3.5 text-destructive" />
            <span>Exportar em PDF</span>
          </button>
          <button
            ref={itemXlsxRef}
            role="menuitem"
            tabIndex={-1}
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 text-foreground-secondary hover:bg-surface-subtle focus:bg-surface-subtle focus:outline-hidden transition-colors cursor-pointer text-left"
            onClick={() => {
              setMenuAberto(false);
              btnRef.current?.focus();
              void iniciar("xlsx");
            }}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-success" />
            <span>Exportar em Excel</span>
          </button>
        </div>
      )}

      {estado.fase === "confirmando" && (
        <ConfirmDialog
          isOpen={true}
          variant="warning"
          titulo="Exportar com dados incompletos?"
          descricao="Algumas informações desta instalação ainda não foram cadastradas:"
          labelConfirmar="Exportar mesmo assim"
          labelCancelar="Cancelar"
          gerenciarFoco={true}
          origemFoco={btnRef}
          podeRestaurarFoco={contextoValido}
          onClose={cancelar}
          onConfirm={() => void confirmarParcial()}
          conteudo={
            <ul className="text-xs text-muted-foreground list-disc list-inside text-left my-3 space-y-1 bg-surface-subtle p-3 rounded-md max-h-[35dvh] overflow-y-auto">
              {estado.faltantes.map((f) => <li key={`${f.grupo}:${f.programacaoId ?? "obra"}`}>{descreverFaltanteInstalacao(f)}</li>)}
            </ul>
          }
        />
      )}
    </div>
  );
}
