import type { ReactNode } from 'react';
import { formatarDataBR } from '@/shared/lib/formatters';
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
  return <Drawer isOpen onClose={onClose} titulo={obra?.clienteNome || `Obra ${programacao.obraId}`} ariaLabel={`Programação da obra ${programacao.obraId}`} tamanho="xl" subtitulo={`Obra #${programacao.obraId} · Programação da instalação`} className="cronograma-drawer"
    acoesHeader={renderizarAcoesObra?.(programacao.obraId)}>
    <div className="cronograma-drawer-body">
      <dl className="cronograma-periodo"><div><dt>Início da programação</dt><dd>{formatarDataBR(programacao.dataInicio)}</dd></div><div><dt>Término da programação</dt><dd>{formatarDataBR(programacao.dataFim)}</dd></div></dl>
      <section className="cronograma-secao"><h3>Período e reagendamento</h3>
      <RevisarReagendamento programacoes={programacoes} tarefaId={programacao.id} dataInicio={programacao.dataInicio} canEdit={canEdit} onCancelar={onClose}
        onReagendar={onReagendar} reagendamentoBloqueado={bloqueado} reagendamentoFase={fase} avisoReagendamento={aviso} /></section>
      <PainelEquipeTemporal key={`${programacao.id}-${programacao.dataInicio}-${programacao.dataFim}`} programacao={programacao} canEdit={canEdit} podeEditar={podeEditar} />
      <PainelProntidao materialStatus={obra?.status} parecerHomologacao={homologacao?.parecerAcesso} registroTecnico={homologacao?.artTrt} prazoVistoria={homologacao?.prazoVistoria} />
    </div>
  </Drawer>;
}
