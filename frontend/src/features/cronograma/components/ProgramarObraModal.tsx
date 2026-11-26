import { useId, useMemo, useRef, useState } from 'react';
import { formatarDataBR } from '@/shared/lib/formatters';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/shared/components/ui/Modal';
import { AlertBanner } from '@/shared/components/ui/AlertBanner';
import { Button } from '@/shared/components/ui/Button';
import { DateInputBR } from '@/shared/components/ui/DateInputBR';
import { ComboboxPesquisavel, type OpcaoCombobox } from '@/shared/components/ui/ComboboxPesquisavel';
import { dataCivilValida, diaUtilCivil, dataFimDiasUteisCivil } from '@/shared/lib/datasCivis';
import { dataBRParaIso } from '@/shared/lib/datasBrasileiras';
import { capturarSessaoOperacional, sessaoOperacionalVigente, deveExibirErroLocal } from '@/shared/lib/sessaoOperacao';
import { useCriarProgramacao } from '../hooks/useProgramacoes';
import { mensagemEquipe, useDisponibilidade, useSessaoCronograma, confirmarConsultaTemporal } from '../hooks/useEquipeTemporal';
import { useOperacoesTemporais } from '../stores/useOperacoesTemporais';
import { DisponibilidadeEquipe } from './DisponibilidadeEquipe';
import type { ObraGanttResumo } from '../types/visaoCronograma';

export function ProgramarObraModal({ obras, onClose, podeEditar }: { obras: ObraGanttResumo[]; onClose: () => void; podeEditar: () => boolean }) {
  const prefixo = useId();
  const [obraId, setObraId] = useState('');
  const [inicioTexto, setInicioTexto] = useState('');
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

  const opcoesObras = useMemo<OpcaoCombobox[]>(() =>
    obras.map(o => ({
      valor: String(o.id),
      rotulo: o.clienteNome || 'Obra sem cliente',
      subtitulo: `${o.quantidadePaineis ?? 0} painéis`,
    })),
  [obras]);

  const obra = obras.find(o => Number(o.id) === Number(obraId));
  const dias = Math.max(1, Math.ceil((obra?.quantidadePaineis ?? 0) / 9));
  const inicio = dataBRParaIso(inicioTexto) ?? '';
  let fim = '';
  if (inicio && dataCivilValida(inicio) && diaUtilCivil(inicio)) {
    try { fim = dataFimDiasUteisCivil(inicio, dias); } catch { /* Limite de calendário: envio impedido. */ }
  }
  const inicioInvalidoTexto = inicioTexto.length === 10 && (!inicio || !diaUtilCivil(inicio));
  const disponibilidade = useDisponibilidade(inicio, fim, false);
  const nome = (campo: string) => `${prefixo}-${campo}`;

  return <Modal tamanho="lg" isOpen onClose={onClose} fecharBloqueado={executando} titulo="Programar obra" subtitulo="Defina a quantidade de pessoas e complete a equipe agora ou depois.">
    <form className="p-5 space-y-4 text-xs" onSubmit={e => {
      e.preventDefault();
      if (trava.current || incerta || !podeEditar()) return;
      if (!obra?.quantidadePaineis || !fim || !Number.isSafeInteger(Number(previstas)) || Number(previstas) < 1) { setErro('Confira obra com painéis, início em dia útil (dd/mm/aaaa) e pessoas previstas.'); return; }
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:h-[312px]">
        <div className="space-y-3 min-w-0">
          <div>
            <label htmlFor={nome('obra')} className="block text-[11px] font-semibold text-muted-foreground mb-1">
              Obra apta para instalação
            </label>
            <ComboboxPesquisavel
              id={nome('obra')}
              listboxAriaLabel="Obras aptas para programação"
              placeholder="Pesquisar obra pelo cliente..."
              opcoes={opcoesObras}
              valorSelecionado={obraId}
              desabilitado={executando}
              compacto={false}
              onSelecionar={val => { setObraId(val); setIntegrantes([]); setErro(''); }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="min-w-0">
              <label htmlFor={nome('inicio')} className="block text-[11px] font-semibold text-muted-foreground mb-1">
                Início (dia útil)
              </label>
              <DateInputBR
                id={nome('inicio')}
                name="dataInicio"
                tamanho="md"
                required
                valor={inicioTexto}
                disabled={executando}
                onChange={mascarado => { setInicioTexto(mascarado); setIntegrantes([]); setErro(''); }}
              />
            </div>
            <div className="min-w-0">
              <label htmlFor={nome('previstas')} className="block text-[11px] font-semibold text-muted-foreground mb-1">
                Pessoas previstas
              </label>
              <input
                id={nome('previstas')}
                name="pessoasPrevistas"
                type="number"
                min="1"
                step="1"
                required
                value={previstas}
                disabled={executando}
                className="w-full h-9 rounded-lg border border-border-subtle bg-surface-subtle focus:bg-surface px-2.5 text-xs tabular-nums text-foreground disabled:opacity-60"
                onChange={e => setPrevistas(e.target.value)}
              />
            </div>
          </div>
          <div
            className={
              inicioInvalidoTexto
                ? 'min-h-[56px] rounded-lg bg-destructive-light px-3 py-2 text-xs text-destructive font-medium flex flex-col justify-center'
                : 'min-h-[56px] rounded-lg bg-surface-subtle px-3 py-2 text-xs text-foreground-muted flex flex-col justify-center'
            }
          >
            {inicioInvalidoTexto ? (
              <span>Informe um dia útil válido (segunda a sexta) no formato dd/mm/aaaa.</span>
            ) : fim ? (
              <span>
                Término estimado: <strong className="font-semibold text-foreground">{formatarDataBR(fim)}</strong> · O servidor confirma a duração ao programar.
              </span>
            ) : (
              <span className="text-muted-foreground">
                Término estimado calculado automaticamente ao informar obra e dia útil.
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Você pode programar sem integrantes e completar a equipe depois.
          </p>
        </div>

        <div className="flex flex-col min-w-0 min-h-0 md:h-full md:border-l md:border-border-subtle md:pl-5">
          <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Equipe da instalação
            </span>
            {integrantes.length > 0 ? (
              <button
                type="button"
                disabled={executando}
                onClick={() => { setIntegrantes([]); setErro(''); }}
                className="text-[11px] font-medium text-info hover:underline cursor-pointer disabled:opacity-50"
              >
                Limpar seleção
              </button>
            ) : (
              <span className="text-[11px] text-muted-foreground">Opcional agora</span>
            )}
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            {!fim && (
              <div className="flex-1 min-h-[140px] flex items-center justify-center text-center rounded-lg bg-surface-subtle border border-dashed border-border-strong p-4 text-xs text-muted-foreground leading-relaxed">
                Escolha a obra e a data de início para consultar os instaladores disponíveis no período.
              </div>
            )}
            {fim && (
              <DisponibilidadeEquipe
                key={`${obraId}-${inicio}-${fim}`}
                inicio={inicio}
                fim={fim}
                selecionados={integrantes}
                onChange={setIntegrantes}
                desabilitado={executando || incerta}
              />
            )}
          </div>
        </div>
      </div>

      {erro && disponibilidade.data?.filter(i => i.ocupado && integrantes.includes(i.usuarioId)).map(i => (
        <p key={i.usuarioId} className="text-xs text-warning">
          {i.nome}: {i.ocupacoes.map(o => `${formatarDataBR(o.dataInicio)} a ${formatarDataBR(o.dataFim)}`).join('; ')}
        </p>
      ))}
      {erro && <p role="alert" className="text-xs text-destructive font-medium">{erro}</p>}
      {incerta && (
        <AlertBanner variante="warning" className="px-3 py-2 border-transparent">
          <div className="space-y-1">
            <p>A operação pode ter sido processada. Consulte o cronograma antes de programar novamente.</p>
            <button
              type="button"
              className="underline font-medium cursor-pointer"
              onClick={() => { void confirmarConsultaTemporal(cliente, sessaoAtual).catch(f => setErro(mensagemEquipe(f))); }}
            >
              Consultar cronograma novamente
            </button>
          </div>
        </AlertBanner>
      )}

      <div className="-mx-5 -mb-5 px-5 py-3 border-t border-border-subtle bg-surface-subtle flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 px-3.5 text-foreground hover:bg-muted shadow-none"
          disabled={executando}
          onClick={onClose}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={executando || incerta}
          className="h-9 px-4 font-semibold shadow-none"
        >
          {executando ? 'Programando...' : 'Confirmar programação'}
        </Button>
      </div>
    </form>
  </Modal>;
}
