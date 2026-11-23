import { useId, useState } from 'react';
import { dataCivilValida, periodoCivilValido, somarDiasCivisUTC } from '@/shared/lib/datasCivis';
import { formatarDataISO, formatarDataBR } from '@/shared/lib/formatters';
import { useOcupacao } from '../hooks/useEquipeTemporal';
import FeedbackLoading from '@/shared/components/feedback/FeedbackLoading';
import FeedbackErro from '@/shared/components/feedback/FeedbackErro';
import { EmptyState } from '@/shared/components/feedback/EmptyState';

export function OcupacaoInstaladores() {
  const id = useId();
  const [inicio, setInicio] = useState(() => formatarDataISO(new Date()));
  const [fim, setFim] = useState(() => somarDiasCivisUTC(formatarDataISO(new Date()), 14));
  const [periodo, setPeriodo] = useState({ inicio, fim });
  const [erro, setErro] = useState('');
  const consulta = useOcupacao(periodo.inicio, periodo.fim, true);
  const controle = 'cronograma-input';
  const tabela = 'cronograma-tabela';
  return <section className="cronograma-ocupacao" aria-label="Ocupação dos instaladores">
    <div className="cronograma-ocupacao-topo"><div><h2>Ocupação dos instaladores</h2><p className="cronograma-ajuda">Consulte a capacidade da equipe e os dias de cada instalador.</p></div><form className="cronograma-ocupacao-filtro" onSubmit={e => { e.preventDefault();
      if (!dataCivilValida(inicio) || !dataCivilValida(fim) || !periodoCivilValido(inicio, fim) || (Date.parse(fim) - Date.parse(inicio)) / 86400000 > 366) { setErro('Informe um período válido de até 366 dias de diferença.'); return; }
      setErro(''); setPeriodo({ inicio, fim });
    }}>
      <div className="flex flex-col"><label htmlFor={`${id}-inicio`}>Início da ocupação</label><input id={`${id}-inicio`} name="dataInicio" type="date" min="0001-01-01" max="9999-12-31" required value={inicio} className={controle} onChange={e => setInicio(e.target.value)} /></div>
      <div className="flex flex-col"><label htmlFor={`${id}-fim`}>Fim da ocupação</label><input id={`${id}-fim`} name="dataFim" type="date" min={inicio || '0001-01-01'} max="9999-12-31" required value={fim} className={controle} onChange={e => setFim(e.target.value)} /></div>
      <button type="submit" className="cronograma-button cronograma-button-primary">Consultar ocupação</button>
    </form></div>
    {erro && <p role="alert" className="text-destructive">{erro}</p>}
    <p className="cronograma-ocupacao-periodo">Período consultado: {formatarDataBR(periodo.inicio)} a {formatarDataBR(periodo.fim)}{consulta.data && ` · ${consulta.data.porInstalador.length} instaladores · ${consulta.data.porDia.length} dias úteis`}</p>
    {consulta.isLoading ? <FeedbackLoading mensagem="Carregando ocupação..." /> : consulta.isError ? <FeedbackErro mensagem="Não foi possível consultar a ocupação." onTentarNovamente={() => void consulta.refetch()} /> : !consulta.data?.porDia.length && !consulta.data?.porInstalador.length ? <EmptyState titulo="Sem ocupação no período" /> : <div className="cronograma-tabelas">
      <div className="cronograma-tabela-regiao" tabIndex={0} role="region" aria-labelledby={`${id}-diaria`}><table className={tabela}><caption id={`${id}-diaria`}>Ocupação diária</caption><thead><tr><th scope="col">Dia</th><th scope="col">Ativos</th><th scope="col">Alocados</th><th scope="col">Livres</th><th scope="col">Faltantes</th></tr></thead>
        <tbody>{consulta.data?.porDia.map(d => <tr key={d.data}><th scope="row">{formatarDataBR(d.data)}</th><td>{d.instaladoresAtivos}</td><td>{d.alocados}</td><td>{d.livres}</td><td>{d.faltantes > 0 ? <span className="cronograma-status is-busy">{d.faltantes}</span> : <span className="text-muted-foreground">0</span>}</td></tr>)}</tbody></table></div>
      <div className="cronograma-tabela-regiao" tabIndex={0} role="region" aria-labelledby={`${id}-instaladores`}><table className={tabela}><caption id={`${id}-instaladores`}>Ocupação por instalador</caption><thead><tr><th scope="col">Instalador</th><th scope="col">Dias úteis</th><th scope="col">Dias alocados</th><th scope="col">Ocupação</th></tr></thead>
        <tbody>{consulta.data?.porInstalador.map(i => <tr key={i.usuarioId}><th scope="row">{i.nome}</th><td>{i.diasUteis}</td><td>{i.diasAlocados}</td><td><span className="cronograma-percentual"><span>{i.ocupacaoPercentual.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span><span className="cronograma-percentual-barra" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.max(0, i.ocupacaoPercentual))}%` }} /></span></span></td></tr>)}</tbody></table></div>
    </div>}
  </section>;
}
