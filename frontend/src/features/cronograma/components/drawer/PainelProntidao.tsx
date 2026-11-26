import { Package, FileCheck, AlertTriangle } from "lucide-react";
import { Badge } from "@/shared/components/ui/Badge";
import { formatarDataBR } from "@/shared/lib/formatters";
import { materialEstaPronto } from "@/features/cronograma/lib/prontidaoObra";
import type { PainelProntidaoProps } from "@/features/cronograma/types/gavetaGantt";

export function PainelProntidao({
  materialStatus,
  parecerHomologacao,
  registroTecnico,
  prazoVistoria,
}: PainelProntidaoProps) {
  const materialSeparado = materialEstaPronto(materialStatus);
  const materialNoDeposito = materialStatus === "NoDeposito";
  const materialComprado = materialStatus === "MaterialComprado";
  const materialAssistencia = materialStatus === "Assistencia";

  const parecerStatus = parecerHomologacao || "Pendente";
  const homologacaoAprovada = parecerStatus === "Aprovado";
  const homologacaoEmAnalise = parecerStatus === "EmAnalise";
  const homologacaoReprovada = parecerStatus === "Reprovado";

  return (
    <section className="space-y-3 text-xs">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Package className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
        <span>Prontidão operacional</span>
      </h3>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
              <span>Insumos &amp; Materiais</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {materialSeparado
                ? "Todos os componentes estão prontos para saída a campo."
                : materialNoDeposito
                ? "Materiais recebidos no depósito central da empresa."
                : materialComprado
                ? "Insumos adquiridos pelo setor de compras em entrega."
                : materialAssistencia
                ? "Aguardando peças de reposição para manutenção."
                : "Obra ainda não possui os kits separados para instalação."}
            </p>
          </div>
          <Badge
            formato="rounded"
            variante={
              materialSeparado
                ? "success"
                : materialNoDeposito
                ? "info"
                : materialComprado || materialAssistencia
                ? "warning"
                : "destructive"
            }
          >
            {materialSeparado
              ? "Kit Pronto / Separado"
              : materialNoDeposito
              ? "No Depósito Central"
              : materialComprado
              ? "Comprado"
              : materialAssistencia
              ? "Assistência"
              : "Pendente"}
          </Badge>
        </div>

        <div className="pt-3 border-t border-border-subtle flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
              <span>Parecer de Acesso</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {homologacaoAprovada &&
                "Projeto aprovado na concessionária. Instalação liberada para ligação."}
              {homologacaoEmAnalise &&
                "Documentação em análise técnica junto à rede distribuidora."}
              {homologacaoReprovada &&
                "Pendências técnicas apontadas. Acesso reprovado provisoriamente."}
              {parecerStatus === "Pendente" &&
                "Aguardando submissão do projeto elétrico à concessionária."}
            </p>
            {(registroTecnico || prazoVistoria) && (
              <p className="text-[11px] text-muted-foreground font-mono mt-1 tabular-nums">
                {registroTecnico && `ART/TRT: ${registroTecnico}`}
                {registroTecnico && prazoVistoria && " · "}
                {prazoVistoria && `Vistoria: ${formatarDataBR(prazoVistoria)}`}
              </p>
            )}
          </div>
          <Badge
            formato="rounded"
            variante={
              homologacaoAprovada
                ? "success"
                : homologacaoEmAnalise
                ? "info"
                : homologacaoReprovada
                ? "destructive"
                : "warning"
            }
          >
            {homologacaoReprovada ? (
              <>
                <AlertTriangle className="w-3 h-3 text-destructive" aria-hidden="true" />
                <span>Reprovado</span>
              </>
            ) : (
              parecerStatus
            )}
          </Badge>
        </div>
      </div>
    </section>
  );
}
