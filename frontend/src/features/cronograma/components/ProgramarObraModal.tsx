import { useId, useRef, useState } from 'react';
import { formatarDataBR } from '@/shared/lib/formatters';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/shared/components/ui/Modal';
import { dataCivilValida, diaUtilCivil, dataFimDiasUteisCivil } from '@/shared/lib/datasCivis';
import { capturarSessaoOperacional, sessaoOperacionalVigente, deveExibirErroLocal } from '@/shared/lib/sessaoOperacao';
import { useCriarProgramacao } from '../hooks/useProgramacoes';
import { mensagemEquipe, useDisponibilidade, useSessaoCronograma, confirmarConsultaTemporal } from '../hooks/useEquipeTemporal';
import { useOperacoesTemporais } from '../stores/useOperacoesTemporais';
import { DisponibilidadeEquipe } from './DisponibilidadeEquipe';
import type { ObraGanttResumo } from '../types/visaoCronograma';

export function ProgramarObraModal({ obras, onClose, podeEditar }: { obras: ObraGanttResumo[]; onClose: () => void; podeEditar: () => boolean }) {
  const prefixo = useId();
  const [obraId, setObraId] = useState('');
  const [inicio, setInicio] = useState('');
  const [previstas, setPrevistas] = useState('1');
  const [integrantes, setIntegrantes] = useState<number[]>([]);
  const [erro, setErro] = useState('');
  const cliente = useQueryClient();
  const sessaoAtual = useSessaoCronograma();
  const incerta = useOperacoesTemporais(s => s.sessao === sessaoAtual && s.fases.nova === 'incerta');
  const [executando, setExecutando] = useState(false);
  const trava = useRef(false);
  const enviou = useRef(false);
  const mutacao = useCriarProgramacao();
  const obra = obras.find(o => Number(o.id) === Number(obraId));
  const dias = Math.max(1, Math.ceil((obra?.quantidadePaineis ?? 0) / 9));
  let fim = '';
  if (dataCivilValida(inicio) && diaUtilCivil(inicio)) {
    try { fim = dataFimDiasUteisCivil(inicio, dias); } catch { /* Limite de calendário: envio impedido. */ }
  }
  const disponibilidade = useDisponibilidade(inicio, fim, false);
  const nome = (campo: string) => `${prefixo}-${campo}`;
  const controle = 'cronograma-input';
  return <Modal className="cronograma-programar" isOpen onClose={onClose} fecharBloqueado={executando} titulo="Programar obra" subtitulo="Defina a quantidade de pessoas e complete a equipe agora ou depois.">
    <form className="cronograma-programar-form text-sm" onSubmit={e => {
      e.preventDefault();
      if (trava.current || incerta || !podeEditar()) return;
      if (!obra?.quantidadePaineis || !fim || !Number.isSafeInteger(Number(previstas)) || Number(previstas) < 1) { setErro('Confira obra com painéis, início em dia útil e pessoas previstas.'); return; }
      const sessao = capturarSessaoOperacional();
      const operacoes = useOperacoesTemporais.getState();
      if (!operacoes.reservar(sessao, 'nova')) return;
      trava.current = true; setExecutando(true);
      void (async () => {
        let confirmouCriacao = false;
        try {
          setErro('');
          if (integrantes.length) {
            const resultado = await disponibilidade.refetch();
            if (!resultado.isSuccess || integrantes.some(id => !resultado.data?.some(i => i.usuarioId === id && !i.ocupado))) throw new Error('A disponibilidade mudou. Confira os instaladores antes de confirmar.');
          }
          if (!podeEditar() || !sessaoOperacionalVigente(sessao)) return;
          enviou.current = true;
          await mutacao.mutateAsync({ obraId: Number(obraId), dataInicio: inicio, pessoasPrevistas: Number(previstas), integrantesIds: integrantes });
          confirmouCriacao = true;
          await confirmarConsultaTemporal(cliente, sessao);
          if (sessaoOperacionalVigente(sessao) && podeEditar()) onClose();
        } catch (falha) {
          if (!sessaoOperacionalVigente(sessao)) return;
          const status = (falha as { response?: { status?: number } }).response?.status;
          operacoes.marcar(sessao, 'nova', confirmouCriacao || (enviou.current && (!status || status >= 500)) ? 'incerta' : 'livre');
          if (!deveExibirErroLocal(falha)) return;
          setErro(mensagemEquipe(falha));
          if (status === 409) void disponibilidade.refetch();
        } finally { if (!enviou.current) operacoes.marcar(sessao, 'nova', 'livre'); trava.current = false; enviou.current = false; if (sessaoOperacionalVigente(sessao)) setExecutando(false); }
      })();
    }}>
      <div className="cronograma-programar-grid"><section className="cronograma-form-secao"><h3>Dados da programação</h3><div><label htmlFor={nome('obra')}>Obra (obrigatório)</label><select id={nome('obra')} name="obraId" required value={obraId} disabled={executando} className={controle}
        onChange={e => { setObraId(e.target.value); setIntegrantes([]); setErro(''); }}>
        <option value="">Selecione uma obra apta</option>{obras.map(o => <option key={o.id} value={o.id}>{o.clienteNome || `Obra ${o.id}`} — {o.quantidadePaineis ?? 0} painéis</option>)}
      </select></div>
      <div className="cronograma-form-datas"><div><label htmlFor={nome('inicio')}>Início (dia útil, obrigatório)</label><input id={nome('inicio')} name="dataInicio" type="date" required min="0001-01-01" max="9999-12-31" value={inicio} disabled={executando} className={controle}
        onChange={e => { setInicio(e.target.value); setIntegrantes([]); setErro(''); }} /></div>
      <div><label htmlFor={nome('previstas')}>Pessoas previstas (obrigatório)</label><input id={nome('previstas')} name="pessoasPrevistas" type="number" min="1" step="1" required value={previstas} disabled={executando} className={controle} onChange={e => setPrevistas(e.target.value)} /></div></div>
      {fim && <p className="cronograma-estimativa">Término estimado: <strong>{formatarDataBR(fim)}</strong><span>O servidor confirma a duração ao programar.</span></p>}<p className="cronograma-ajuda">Você pode programar sem integrantes e completar a equipe depois.</p></section><section className="cronograma-form-secao cronograma-selecao">
      {!fim && <div className="cronograma-selecao-vazia"><h3>Equipe da instalação</h3><p>Escolha a data de início para consultar os instaladores disponíveis no período.</p></div>}{fim && <DisponibilidadeEquipe key={`${obraId}-${inicio}-${fim}`} inicio={inicio} fim={fim} selecionados={integrantes} onChange={setIntegrantes} desabilitado={executando || incerta} />}
      {integrantes.length > 0 && <button type="button" className="min-h-12 underline" disabled={executando} onClick={() => { setIntegrantes([]); setErro(''); }}>Limpar integrantes e programar sem equipe</button>}</section></div>
      {erro && disponibilidade.data?.filter(i => i.ocupado && integrantes.includes(i.usuarioId)).map(i => <p key={i.usuarioId} className="text-warning">{i.nome}: {i.ocupacoes.map(o => `Obra ${o.obraId}, ${o.dataInicio} a ${o.dataFim}`).join('; ')}</p>)}
      {erro && <p role="alert" className="text-destructive">{erro}</p>}
      {incerta && <div role="alert"><p>A operação pode ter sido processada. Consulte o cronograma antes de programar novamente.</p><button type="button" className="min-h-12 underline" onClick={() => { void confirmarConsultaTemporal(cliente, sessaoAtual).catch(f => setErro(mensagemEquipe(f))); }}>Consultar cronograma novamente</button></div>}
      <div className="cronograma-form-footer"><button type="button" className="cronograma-button" disabled={executando} onClick={onClose}>Cancelar</button>
        <button type="submit" disabled={executando || incerta} className="cronograma-button cronograma-button-primary">{executando ? 'Programando...' : 'Confirmar programação'}</button></div>
    </form>
  </Modal>;
}
