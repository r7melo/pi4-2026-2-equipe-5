import type { ReactNode } from 'react';
import { formatarDataBR } from '@/shared/lib/formatters';
import { diasUteisCivis } from '@/shared/lib/datasCivis';
import { Drawer } from '@/shared/components/ui/Drawer';
import type { Programacao } from '@/shared/types/programacoes';
import type { ObraGanttResumo, HomologacaoGanttResumo } from '../types/visaoCronograma';
import type { FaseReagendamento } from '../types/gavetaGantt';
import { PainelEquipeTemporal } from './PainelEquipeTemporal';
import { RevisarReagendamento } from './RevisarReagendamento';
import { PainelProntidao } from './drawer/PainelProntidao';

export function ProgramacaoDrawer({ programacao, programacoes, obra, homologacao, onClose, canEdit, podeEditar, onReagendar, bloqueado, fase, aviso, renderizarAcoesObra }: {
  programacao: Programacao; programacoes: Programacao[]; obra?: ObraGanttResumo; homologacao?: HomologacaoGanttResumo;
  onClose: () => void; canEdit: boolean; podeEditar: () => boolean;
  onReagendar: (id: number, inicio: string) => Promise<boolean | null>; bloqueado: boolean; fase: FaseReagendamento; aviso: string | null;
  renderizarAcoesObra?: (id: number) => ReactNode;
}) {
  const nomeCliente = obra?.clienteNome || 'Obra sem cliente';
  const diasUteis = diasUteisCivis(programacao.dataInicio, programacao.dataFim);

  return (
    <Drawer
      isOpen
      onClose={onClose}
      ariaLabel={`Programação de ${nomeCliente}`}
      tamanho="lg"
      acoesHeader={renderizarAcoesObra?.(programacao.obraId)}
      headerCustomizado={
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-foreground truncate">{nomeCliente}</h2>
            {obra?.categoria && (
              <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground shrink-0">
                {obra.categoria}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Programação da instalação</p>
        </div>
      }
    >
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-border-subtle">
        <section className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Período e reagendamento
            </h3>
            <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
              {diasUteis} {diasUteis === 1 ? 'dia útil' : 'dias úteis'}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-[11px] text-muted-foreground">Início da programação</dt>
              <dd className="font-semibold text-foreground tabular-nums mt-0.5">
                {formatarDataBR(programacao.dataInicio)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted-foreground">Término da programação</dt>
              <dd className="font-semibold text-foreground tabular-nums mt-0.5">
                {formatarDataBR(programacao.dataFim)}
              </dd>
            </div>
          </dl>

          <RevisarReagendamento
            programacoes={programacoes}
            tarefaId={programacao.id}
            dataInicio={programacao.dataInicio}
            canEdit={canEdit}
            onCancelar={onClose}
            onReagendar={onReagendar}
            reagendamentoBloqueado={bloqueado}
            reagendamentoFase={fase}
            avisoReagendamento={aviso}
          />
        </section>

        <div className="p-5">
          <PainelEquipeTemporal
            key={`${programacao.id}-${programacao.dataInicio}-${programacao.dataFim}`}
            programacao={programacao}
            canEdit={canEdit}
            podeEditar={podeEditar}
          />
        </div>

        <div className="p-5">
          <PainelProntidao
            materialStatus={obra?.status}
            parecerHomologacao={homologacao?.parecerAcesso}
            registroTecnico={homologacao?.artTrt}
            prazoVistoria={homologacao?.prazoVistoria}
          />
        </div>
      </div>
    </Drawer>
  );
}
