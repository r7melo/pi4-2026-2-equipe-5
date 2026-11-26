import { useId, useState } from 'react';
import { dataCivilValida, periodoCivilValido, somarDiasCivisUTC } from '@/shared/lib/datasCivis';
import {
  dataBRParaIso,
  isoParaDataBR,
} from '@/shared/lib/datasBrasileiras';
import { formatarDataISO, formatarDataBR } from '@/shared/lib/formatters';
import { DateInputBR } from '@/shared/components/ui/DateInputBR';
import { SegmentedControl } from '@/shared/components/ui/SegmentedControl';
import { Badge } from '@/shared/components/ui/Badge';
import { cn } from '@/shared/lib/utils';
import { useOcupacao } from '../hooks/useEquipeTemporal';
import FeedbackLoading from '@/shared/components/feedback/FeedbackLoading';
import FeedbackErro from '@/shared/components/feedback/FeedbackErro';
import { EmptyState } from '@/shared/components/feedback/EmptyState';

export function OcupacaoInstaladores() {
  const id = useId();
  const [inicioInicial] = useState(() => formatarDataISO(new Date()));
  const [fimInicial] = useState(() => somarDiasCivisUTC(formatarDataISO(new Date()), 14));
  const [textoInicio, setTextoInicio] = useState(() => isoParaDataBR(inicioInicial));
  const [textoFim, setTextoFim] = useState(() => isoParaDataBR(fimInicial));
  const [periodo, setPeriodo] = useState({ inicio: inicioInicial, fim: fimInicial });
  const [abaMobile, setAbaMobile] = useState<'instaladores' | 'diaria'>('instaladores');
  const [erro, setErro] = useState('');
  const consulta = useOcupacao(periodo.inicio, periodo.fim, true);

  const totalInstaladores = consulta.data?.porInstalador.length ?? 0;
  const totalDiasUteis = consulta.data?.porDia.length ?? 0;
  const mediaOcupacao =
    totalInstaladores > 0
      ? (consulta.data?.porInstalador.reduce((acc, item) => acc + item.ocupacaoPercentual, 0) ?? 0) /
        totalInstaladores
      : 0;
  const diasComFalta = consulta.data?.porDia.filter(d => d.faltantes > 0).length ?? 0;

  return (
    <section
      className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-background-app p-4 sm:p-5"
      aria-label="Ocupação dos instaladores"
    >
      <div className="max-w-6xl mx-auto space-y-3.5">
        <div className="rounded-xl border border-border-subtle bg-surface p-3.5 flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground tracking-tight">
              Ocupação dos instaladores
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Capacidade diária da equipe de campo e dias alocados no período.
            </p>
          </div>
          <form
            className="grid grid-cols-2 sm:flex sm:items-end gap-2 shrink-0"
            onSubmit={e => {
              e.preventDefault();
              const inicioIso = dataBRParaIso(textoInicio);
              const fimIso = dataBRParaIso(textoFim);
              if (
                !inicioIso ||
                !fimIso ||
                !dataCivilValida(inicioIso) ||
                !dataCivilValida(fimIso) ||
                !periodoCivilValido(inicioIso, fimIso) ||
                (Date.parse(fimIso) - Date.parse(inicioIso)) / 86400000 > 366
              ) {
                setErro('Informe um período válido em dd/mm/aaaa com até 366 dias de diferença.');
                return;
              }
              setErro('');
              setPeriodo({ inicio: inicioIso, fim: fimIso });
            }}
          >
            <div className="min-w-0">
              <label htmlFor={`${id}-inicio`} className="block text-[11px] font-medium text-muted-foreground mb-1">
                Início
              </label>
              <DateInputBR
                id={`${id}-inicio`}
                name="dataInicio"
                tamanho="xs"
                required
                valor={textoInicio}
                onChange={setTextoInicio}
                className="sm:w-[110px]"
              />
            </div>
            <div className="min-w-0">
              <label htmlFor={`${id}-fim`} className="block text-[11px] font-medium text-muted-foreground mb-1">
                Fim
              </label>
              <DateInputBR
                id={`${id}-fim`}
                name="dataFim"
                tamanho="xs"
                required
                valor={textoFim}
                onChange={setTextoFim}
                className="sm:w-[110px]"
              />
            </div>
            <button
              type="submit"
              className="controle-compacto col-span-2 sm:col-span-1 h-7 px-3 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors"
            >
              Consultar
            </button>
          </form>
        </div>

        {erro && (
          <p role="alert" className="text-xs text-destructive font-medium">
            {erro}
          </p>
        )}

        {consulta.data && (
          <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-border-subtle bg-surface overflow-hidden">
            <div className="p-3 border-r border-b lg:border-b-0 border-border-subtle">
              <p className="text-[11px] text-muted-foreground font-medium truncate">Instaladores ativos</p>
              <p className="text-base font-bold tabular-nums text-foreground mt-0.5">{totalInstaladores}</p>
            </div>
            <div className="p-3 border-b lg:border-b-0 lg:border-r border-border-subtle">
              <p className="text-[11px] text-muted-foreground font-medium truncate">Dias úteis</p>
              <p className="text-base font-bold tabular-nums text-foreground mt-0.5">{totalDiasUteis}</p>
            </div>
            <div className="p-3 border-r border-border-subtle">
              <p className="text-[11px] text-muted-foreground font-medium truncate">Ocupação média</p>
              <p className="text-base font-bold tabular-nums text-info mt-0.5">
                {mediaOcupacao.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
              </p>
            </div>
            <div className="p-3">
              <p className="text-[11px] text-muted-foreground font-medium truncate">Dias com falta</p>
              <p className="text-base font-bold tabular-nums text-warning mt-0.5">
                {diasComFalta} {diasComFalta === 1 ? 'dia' : 'dias'}
              </p>
            </div>
          </div>
        )}

        {consulta.isLoading ? (
          <FeedbackLoading mensagem="Carregando ocupação..." />
        ) : consulta.isError ? (
          <FeedbackErro
            mensagem="Não foi possível consultar a ocupação."
            onTentarNovamente={() => void consulta.refetch()}
          />
        ) : !consulta.data?.porDia.length && !consulta.data?.porInstalador.length ? (
          <EmptyState titulo="Sem ocupação no período" />
        ) : (
          <div className="space-y-3">
            <SegmentedControl
              ariaLabel="Visão da ocupação no mobile"
              tamanho="sm"
              larguraTotal
              className="md:hidden"
              valor={abaMobile}
              onChange={setAbaMobile}
              opcoes={[
                { valor: 'instaladores', rotulo: 'Por instalador' },
                { valor: 'diaria', rotulo: 'Capacidade diária' },
              ]}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <section
                className={cn(
                  'rounded-xl border border-border-subtle bg-surface overflow-hidden',
                  abaMobile !== 'instaladores' && 'hidden md:block'
                )}
                tabIndex={0}
                role="region"
                aria-labelledby={`${id}-instaladores`}
              >
                <div className="px-3.5 py-2.5 border-b border-border-subtle flex items-center justify-between gap-2">
                  <h3 id={`${id}-instaladores`} className="text-[13px] font-semibold text-foreground">
                    Por instalador
                  </h3>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    Dias alocados / úteis
                  </span>
                </div>

                <div className="hidden md:block overflow-x-auto max-h-[540px] overflow-y-auto overscroll-contain">
                  <table className="w-full text-xs text-left border-collapse tabular-nums">
                    <thead className="sticky top-0 z-10 bg-surface-subtle text-muted-foreground border-b border-border-subtle">
                      <tr>
                        <th scope="col" className="px-3.5 py-2 font-semibold">Instalador</th>
                        <th scope="col" className="px-2.5 py-2 font-semibold text-right">Úteis</th>
                        <th scope="col" className="px-2.5 py-2 font-semibold text-right">Aloc.</th>
                        <th scope="col" className="px-3.5 py-2 font-semibold">Ocupação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {consulta.data?.porInstalador.map(i => (
                        <tr key={i.usuarioId} className="hover:bg-surface-subtle transition-colors">
                          <th scope="row" className="px-3.5 py-2 font-medium text-foreground whitespace-nowrap">
                            {i.nome}
                          </th>
                          <td className="px-2.5 py-2 text-right text-muted-foreground">{i.diasUteis}</td>
                          <td className="px-2.5 py-2 text-right font-medium text-foreground">{i.diasAlocados}</td>
                          <td className="px-3.5 py-2">
                            <div className="flex items-center gap-2 min-w-[100px]">
                              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden" aria-hidden="true">
                                <div
                                  className="h-full bg-info rounded-full"
                                  style={{
                                    width: `${Math.min(100, Math.max(0, i.ocupacaoPercentual))}%`,
                                  }}
                                />
                              </div>
                              <span className="w-10 text-right font-medium text-foreground tabular-nums">
                                {i.ocupacaoPercentual.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ul className="md:hidden divide-y divide-border-subtle">
                  {consulta.data?.porInstalador.map(i => (
                    <li key={i.usuarioId} className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{i.nome}</p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">
                          {i.diasAlocados} alocados / {i.diasUteis} úteis
                        </p>
                      </div>
                      <div className="w-24 shrink-0 text-right space-y-1">
                        <span className="font-semibold text-foreground tabular-nums">
                          {i.ocupacaoPercentual.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
                        </span>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden" aria-hidden="true">
                          <div
                            className="h-full bg-info"
                            style={{ width: `${Math.min(100, Math.max(0, i.ocupacaoPercentual))}%` }}
                          />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section
                className={cn(
                  'rounded-xl border border-border-subtle bg-surface overflow-hidden',
                  abaMobile !== 'diaria' && 'hidden md:block'
                )}
                tabIndex={0}
                role="region"
                aria-labelledby={`${id}-diaria`}
              >
                <div className="px-3.5 py-2.5 border-b border-border-subtle flex items-center justify-between gap-2">
                  <h3 id={`${id}-diaria`} className="text-[13px] font-semibold text-foreground">
                    Capacidade diária
                  </h3>
                  <span className="text-[11px] text-muted-foreground">Saldo por dia útil</span>
                </div>

                <div className="hidden md:block overflow-x-auto max-h-[540px] overflow-y-auto overscroll-contain">
                  <table className="w-full text-xs text-left border-collapse tabular-nums">
                    <thead className="sticky top-0 z-10 bg-surface-subtle text-muted-foreground border-b border-border-subtle">
                      <tr>
                        <th scope="col" className="px-3.5 py-2 font-semibold">Dia</th>
                        <th scope="col" className="px-2.5 py-2 font-semibold text-right">Ativos</th>
                        <th scope="col" className="px-2.5 py-2 font-semibold text-right">Aloc.</th>
                        <th scope="col" className="px-2.5 py-2 font-semibold text-right">Livres</th>
                        <th scope="col" className="px-3.5 py-2 font-semibold text-right">Faltam</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {consulta.data?.porDia.map(d => (
                        <tr key={d.data} className="hover:bg-surface-subtle transition-colors">
                          <th scope="row" className="px-3.5 py-2 font-medium text-foreground whitespace-nowrap">
                            {formatarDataBR(d.data)}
                          </th>
                          <td className="px-2.5 py-2 text-right text-muted-foreground">{d.instaladoresAtivos}</td>
                          <td className="px-2.5 py-2 text-right font-medium text-foreground">{d.alocados}</td>
                          <td className="px-2.5 py-2 text-right text-success font-medium">{d.livres}</td>
                          <td className="px-3.5 py-2 text-right">
                            {d.faltantes > 0 ? (
                              <Badge variante="warning" formato="rounded" className="px-1.5">
                                {d.faltantes}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ul className="md:hidden divide-y divide-border-subtle">
                  {consulta.data?.porDia.map(d => (
                    <li key={d.data} className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                      <div>
                        <p className="font-medium text-foreground tabular-nums">{formatarDataBR(d.data)}</p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">
                          Ativos {d.instaladoresAtivos} · Aloc. {d.alocados} · Livres {d.livres}
                        </p>
                      </div>
                      {d.faltantes > 0 ? (
                        <Badge variante="warning" formato="rounded">
                          Faltam {d.faltantes}
                        </Badge>
                      ) : (
                        <span className="text-[11px] font-medium text-success shrink-0">Coberto</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
