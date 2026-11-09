import { Package, FileCheck, Loader2, AlertTriangle } from "lucide-react";
import { formatarDataBR } from "@/shared/lib/formatters";
import { materialEstaPronto } from "@/features/cronograma/lib/prontidaoObra";
import type { PainelProntidaoProps } from "@/features/cronograma/types/gavetaGantt";

export function PainelProntidao({
  materialStatus,
  carregandoHomologacao = false,
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
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-foreground-secondary uppercase tracking-wider flex items-center gap-1.5">
        <Package className="w-4 h-4 text-muted-foreground" />
        <span>Prontidão Operacional</span>
      </h3>

      <div className="space-y-2">
        {/* Card de Material */}
        <div className="p-3 bg-surface border border-border-subtle rounded-xl space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-subtle-foreground" /> Insumos & Materiais
            </span>
            <span
              className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                materialSeparado
                  ? "bg-success-light text-success border border-success-border"
                  : materialNoDeposito
                  ? "bg-info-light text-info border border-info-border"
                  : materialComprado
                  ? "bg-warning-light text-warning border border-warning-border"
                  : materialAssistencia
                  ? "bg-warning-light text-warning border border-warning-border"
                  : "bg-destructive-light text-destructive border border-destructive-border"
              }`}
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
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
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

        {/* Card de Parecer de Acesso */}
        <div className="p-3 bg-surface border border-border-subtle rounded-xl space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-subtle-foreground" /> Parecer de Acesso
            </span>
            <span
              className={`font-semibold px-2 py-0.5 rounded text-[11px] flex items-center gap-1 ${
                carregandoHomologacao
                  ? "bg-muted text-foreground-muted"
                  : homologacaoAprovada
                  ? "bg-success-light text-success border border-success-border"
                  : homologacaoEmAnalise
                  ? "bg-info-light text-info border border-info-border"
                  : homologacaoReprovada
                  ? "bg-destructive-light text-destructive border border-destructive-border"
                  : "bg-warning-light text-warning border border-warning-border"
              }`}
            >
              {carregandoHomologacao ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" /> Verificando...
                </>
              ) : homologacaoReprovada ? (
                <>
                  <AlertTriangle className="w-3 h-3 text-destructive" /> Reprovado
                </>
              ) : (
                parecerStatus
              )}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {carregandoHomologacao && "Consultando concessionária de energia..."}
            {!carregandoHomologacao && homologacaoAprovada && (
              "Projeto aprovado na concessionária. Instalação liberada para ligação."
            )}
            {!carregandoHomologacao && homologacaoEmAnalise && (
              "Documentação em análise técnica junto à rede distribuidora."
            )}
            {!carregandoHomologacao && homologacaoReprovada && (
              "Pendências técnicas apontadas. Acesso reprovado provisoriamente."
            )}
            {!carregandoHomologacao && parecerStatus === "Pendente" && (
              "Aguardando submissão do projeto elétrico à concessionária."
            )}
          </p>
          {(registroTecnico || prazoVistoria) && (
            <div className="pt-2 mt-2 border-t border-border-subtle grid grid-cols-2 gap-2 text-[11px]">
              {registroTecnico && (
                <div>
                  <span className="text-muted-foreground block text-[10px]">Registro Técnico</span>
                  <span className="font-mono font-semibold text-foreground-muted">{registroTecnico}</span>
                </div>
              )}
              {prazoVistoria && (
                <div>
                  <span className="text-muted-foreground block text-[10px]">Prazo de Vistoria</span>
                  <span className="font-semibold text-foreground-muted">{formatarDataBR(prazoVistoria)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
