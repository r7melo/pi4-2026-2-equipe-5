import { CheckCircle, Clock, UploadCloud, Building, FileText } from "lucide-react";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { Badge } from "@/shared/components/ui/Badge";

export default function Homologacao() {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header Reutilizável */}
      <PageHeader
        title="Homologação: João Silva"
        subtitle="Acompanhamento junto à Concessionária"
        backTo="/kanban"
      >
        <Badge
          variante="warning"
          tamanho="sm"
          comBorda
          className="px-2.5 py-0.5 text-xs font-semibold gap-1.5"
          title="Status: Em Análise"
        >
          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">Em Análise</span>
        </Badge>

      </PageHeader>

      <section className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-background-app custom-scrollbar">
          <div className="w-full max-w-4xl space-y-6">
          
          {/* Card Resumo */}
          <div className="bg-surface p-6 rounded-xl border border-border-subtle flex items-center gap-4">
            <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center shrink-0">
              <Building className="w-6 h-6 text-foreground-muted" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground-secondary">Concessionária Local (Enel)</h2>
              <p className="text-sm text-muted-foreground font-mono tabular-nums">Unidade Consumidora: 102938475 • Protocolo: #2026-991</p>
            </div>
          </div>

          {/* Stepper Vertical */}
          <div className="bg-surface rounded-xl border border-border-subtle p-6 md:p-8">
            <h3 className="text-lg font-bold text-foreground-secondary mb-8">Etapas do Processo</h3>
            
            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-muted">
              
              {/* Etapa 1: Concluída */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-surface bg-success text-primary-foreground shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-success-border bg-success-light">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-success">Parecer de Acesso</h4>
                    <Badge variante="success" formato="rounded" tamanho="xs" className="text-micro font-bold px-2 py-0.5 uppercase">Concluído</Badge>
                  </div>
                  <p className="text-sm text-success mb-3">Solicitação enviada e aprovada pela rede.</p>
                  <button type="button" className="text-xs font-semibold text-success flex items-center gap-1 hover:underline cursor-pointer">
                    <FileText className="w-3.5 h-3.5" /> Ver PDF do Parecer
                  </button>
                </div>
              </div>

              {/* Etapa 2: Em Andamento */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-surface bg-warning text-primary-foreground shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-warning-border bg-surface relative">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-foreground-secondary">Emissão de ART</h4>
                    <Badge variante="warning" formato="rounded" tamanho="xs" className="text-micro font-bold px-2 py-0.5 uppercase">Pendente</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">Aguardando engenheiro responsável anexar o documento.</p>
                  
                  <button type="button" className="w-full border border-dashed border-border-strong rounded-lg p-4 flex flex-col items-center justify-center text-muted-foreground hover:bg-surface-subtle hover:border-foreground-muted hover:text-foreground-muted transition-colors cursor-pointer">
                    <UploadCloud className="w-6 h-6 mb-2" />
                    <span className="text-sm font-semibold">Anexar ART (.pdf)</span>
                  </button>
                </div>
              </div>

              {/* Etapa 3: Futura */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-surface bg-muted text-subtle-foreground shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <div className="w-2.5 h-2.5 bg-subtle-foreground rounded-full"></div>
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border-subtle bg-surface">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-foreground-secondary">Solicitar Vistoria</h4>
                    <Badge variante="neutral" formato="rounded" tamanho="xs" className="text-micro font-bold px-2 py-0.5 uppercase">Bloqueado</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Requer a emissão da ART para ser liberada.</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>
    </div>
  );
}