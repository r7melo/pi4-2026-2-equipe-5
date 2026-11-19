import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { formatarDataBR } from "@/shared/lib/formatters";
import type { ComentarioItemKanban } from "../../types/gavetaKanban";

const COMENTARIOS_VAZIOS: ComentarioItemKanban[] = [];

interface AbaComentariosObraProps {
  obraId: number;
  canEdit?: boolean;
  comentarios?: ComentarioItemKanban[];
  carregandoComentarios?: boolean;
  onAdicionarComentario?: (id: number, texto: string) => Promise<void>;
  isEnviandoComentario?: boolean;
}

export function AbaComentariosObra({
  obraId,
  canEdit = false,
  comentarios = COMENTARIOS_VAZIOS,
  carregandoComentarios = false,
  onAdicionarComentario,
  isEnviandoComentario = false,
}: AbaComentariosObraProps) {
  const [novoComentario, setNovoComentario] = useState("");

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !novoComentario.trim() || !onAdicionarComentario) return;
    try {
      await onAdicionarComentario(obraId, novoComentario.trim());
      setNovoComentario("");
    } catch {
      // Erro gerenciado no hook
    }
  };

  return (
    <div className="space-y-4">
      {canEdit ? (
        <form onSubmit={handleEnviar} className="flex gap-2">
          <input
            type="text"
            value={novoComentario}
            onChange={(e) => setNovoComentario(e.target.value)}
            placeholder="Adicionar nota interna sobre a obra..."
            aria-label="Adicionar nota interna sobre a obra"
            disabled={isEnviandoComentario}
            className="flex-1 text-xs px-3 py-2 bg-surface text-foreground border border-border-strong rounded-lg focus:outline-none focus:ring-1 focus:ring-info placeholder-subtle-foreground"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            aria-label="Enviar comentário"
            disabled={!novoComentario.trim() || isEnviandoComentario}
            className="shrink-0"
          >
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
          </Button>
        </form>
      ) : (
        <div className="p-2 text-xs text-muted-foreground bg-surface-subtle border border-border-subtle rounded-lg text-center">
          Comentários habilitados apenas para Administrador e Engenharia.
        </div>
      )}

      {carregandoComentarios && (
        <div className="py-8 text-center text-xs text-muted-foreground">Carregando comentários...</div>
      )}

      {!carregandoComentarios && comentarios.length > 0 && (
        <div className="space-y-2.5">
          {comentarios.map((c) => (
            <div key={c.id} className="p-2.5 bg-surface-subtle border border-border-subtle rounded-lg">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                <span className="font-semibold text-foreground-muted">{c.usuarioNome || "Colaborador"}</span>
                <span>{formatarDataBR(c.dataHora)}</span>
              </div>
              <p className="text-xs text-foreground-muted leading-relaxed whitespace-pre-wrap">
                {c.texto}
              </p>
            </div>
          ))}
        </div>
      )}

      {!carregandoComentarios && comentarios.length === 0 && (
        <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border-subtle rounded-xl">
          Nenhum comentário cadastrado para esta obra.
        </div>
      )}
    </div>
  );
}
