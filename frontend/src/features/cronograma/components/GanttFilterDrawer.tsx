import { useId, useState } from "react";
import { Filter } from "lucide-react";
import { toast } from "sonner";
import { SearchInput } from "@/shared/components/ui/SearchInput";
import { Button } from "@/shared/components/ui/Button";
import { Drawer } from "@/shared/components/ui/Drawer";
import { DateInputBR } from "@/shared/components/ui/DateInputBR";
import { SegmentedControl } from "@/shared/components/ui/SegmentedControl";
import {
  dataBRParaIso,
  isoParaDataBR,
} from "@/shared/lib/datasBrasileiras";
import type { Equipe } from "../types/equipes";
import type { GanttFiltrosAvancados } from "../types/gantt";
import type { CategoriaObraGantt } from "@/features/cronograma/types/visaoCronograma";
import type { StatusObra } from "@/shared/constants/kanbanStatus";

interface GanttFilterDrawerProps {
  aberto: boolean;
  onFechar: () => void;
  filtrosAtuais: GanttFiltrosAvancados;
  onAplicarFiltros: (novos: GanttFiltrosAvancados) => void;
  onSalvarVisaoFavorita?: (filtros: GanttFiltrosAvancados) => void;
  equipesDisponiveis: Equipe[];
}

interface DatasFiltroBR {
  inicioDe: string;
  inicioAte: string;
  fimDe: string;
  fimAte: string;
}

function extrairDatasBR(filtros: GanttFiltrosAvancados): DatasFiltroBR {
  return {
    inicioDe: isoParaDataBR(filtros.dataInicioDe),
    inicioAte: isoParaDataBR(filtros.dataInicioAte),
    fimDe: isoParaDataBR(filtros.dataFimDe),
    fimAte: isoParaDataBR(filtros.dataFimAte),
  };
}

export function GanttFilterDrawer({
  aberto,
  onFechar,
  filtrosAtuais,
  onAplicarFiltros,
  onSalvarVisaoFavorita,
  equipesDisponiveis,
}: GanttFilterDrawerProps) {
  const baseId = useId();
  const [prevAberto, setPrevAberto] = useState(aberto);
  const [form, setForm] = useState<GanttFiltrosAvancados>(filtrosAtuais);
  const [datasBR, setDatasBR] = useState<DatasFiltroBR>(() => extrairDatasBR(filtrosAtuais));
  const [limpezas, setLimpezas] = useState(0);

  if (prevAberto !== aberto) {
    setPrevAberto(aberto);
    if (aberto) {
      setForm(filtrosAtuais);
      setDatasBR(extrairDatasBR(filtrosAtuais));
      setLimpezas(0);
    }
  }

  const resolverPayloadComDatas = (): GanttFiltrosAvancados | null => {
    const converter = (br: string): string | undefined | null => {
      const limpo = br.trim();
      if (!limpo) return undefined;
      return dataBRParaIso(limpo) ?? null;
    };

    const dataInicioDe = converter(datasBR.inicioDe);
    const dataInicioAte = converter(datasBR.inicioAte);
    const dataFimDe = converter(datasBR.fimDe);
    const dataFimAte = converter(datasBR.fimAte);

    if ([dataInicioDe, dataInicioAte, dataFimDe, dataFimAte].some((d) => d === null)) {
      toast.error("Informe datas válidas no formato dd/mm/aaaa.");
      return null;
    }

    return {
      ...form,
      dataInicioDe: dataInicioDe ?? undefined,
      dataInicioAte: dataInicioAte ?? undefined,
      dataFimDe: dataFimDe ?? undefined,
      dataFimAte: dataFimAte ?? undefined,
    };
  };

  const handleLimpar = () => {
    const limpo: GanttFiltrosAvancados = {};
    setForm(limpo);
    setDatasBR({ inicioDe: "", inicioAte: "", fimDe: "", fimAte: "" });
    onAplicarFiltros(limpo);
    setLimpezas((n) => n + 1);
    toast.info("Filtros do cronograma redefinidos");
  };

  const handleAplicar = () => {
    const payload = resolverPayloadComDatas();
    if (!payload) return;
    onAplicarFiltros(payload);
    onFechar();
    toast.success("Filtros aplicados ao cronograma");
  };

  const handleSalvarFavorito = () => {
    const payload = resolverPayloadComDatas();
    if (!payload) return;
    onAplicarFiltros(payload);
    onSalvarVisaoFavorita?.(payload);
    toast.success("Visão personalizada salva com sucesso!");
    onFechar();
  };

  const selectClass =
    "w-full h-8 px-2 bg-surface-subtle border border-border-subtle rounded-md focus:bg-surface text-xs text-foreground cursor-pointer";

  return (
    <Drawer
      isOpen={aberto}
      onClose={onFechar}
      tamanho="lg"
      titulo="Filtros avançados"
      icone={<Filter className="w-4 h-4 text-info" aria-hidden="true" />}
    >
      <div role="status" aria-live="polite" className="sr-only">
        {limpezas > 0 ? (limpezas % 2 === 1 ? "Filtros do cronograma redefinidos" : "Filtros do cronograma redefinidos.") : ""}
      </div>

      <form
        id={`${baseId}-form`}
        onSubmit={(e) => {
          e.preventDefault();
          handleAplicar();
        }}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-border-subtle text-xs"
      >
        <section className="p-4 space-y-2.5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Obra e etapa
          </h3>

          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Buscar obra ou cliente
            </label>
            <SearchInput
              valor={form.termoBusca || ""}
              onChange={(val) => setForm({ ...form, termoBusca: val })}
              placeholder="Nome do cliente, equipe..."
              tamanho="xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor={`${baseId}-categoria`} className="block text-[11px] font-medium text-muted-foreground mb-1">
                Categoria
              </label>
              <select
                id={`${baseId}-categoria`}
                value={form.categoria || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    categoria: (e.target.value as CategoriaObraGantt) || undefined,
                  })
                }
                className={selectClass}
              >
                <option value="">Todas</option>
                <option value="Residencial">Residencial</option>
                <option value="Comercial">Comercial</option>
                <option value="Industrial">Industrial</option>
                <option value="Rural">Rural</option>
                <option value="Manutenção">Manutenção</option>
              </select>
            </div>

            <div>
              <label htmlFor="campo-ganttfilterdrawer-2" className="block text-[11px] font-medium text-muted-foreground mb-1">
                Etapa da obra
              </label>
              <select
                id="campo-ganttfilterdrawer-2"
                value={form.statusObra || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    statusObra: (e.target.value as StatusObra) || undefined,
                  })
                }
                className={selectClass}
              >
                <option value="">Todas</option>
                <option value="MaterialComprado">Material Comprado</option>
                <option value="NoDeposito">No Depósito</option>
                <option value="Separado">Separado</option>
                <option value="EmAndamento">Em Andamento</option>
                <option value="Concluido">Concluído</option>
                <option value="Assistencia">Assistência</option>
              </select>
            </div>

            <div>
              <label htmlFor="campo-ganttfilterdrawer-3" className="block text-[11px] font-medium text-muted-foreground mb-1">
                Prioridade
              </label>
              <select
                id="campo-ganttfilterdrawer-3"
                value={form.prioridade !== undefined ? form.prioridade : ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    prioridade: e.target.value !== "" ? Number(e.target.value) : undefined,
                  })
                }
                className={selectClass}
              >
                <option value="">Todas</option>
                <option value="1">Alta (1)</option>
                <option value="2">Média (2)</option>
                <option value="3">Baixa (3)</option>
              </select>
            </div>

            <div>
              <label htmlFor="campo-ganttfilterdrawer-1" className="block text-[11px] font-medium text-muted-foreground mb-1">
                Instalador
              </label>
              <select
                id="campo-ganttfilterdrawer-1"
                value={form.instaladorId || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    instaladorId: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className={selectClass}
              >
                <option value="">Todos</option>
                {equipesDisponiveis.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label htmlFor="campo-ganttfilterdrawer-4" className="block text-[11px] font-medium text-muted-foreground mb-1">
                Atualizado por (Responsável)
              </label>
              <input
                id="campo-ganttfilterdrawer-4"
                type="text"
                value={form.responsavel || ""}
                onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                placeholder="Ex.: Ana Souza, Carlos Administrador..."
                className="w-full h-8 px-2.5 bg-surface-subtle border border-border-subtle rounded-md focus:bg-surface text-xs text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </section>

        <section className="p-4 space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Equipe e prontidão
          </h3>

          <div>
            <span className="block text-[11px] font-medium text-muted-foreground mb-1">
              Prontidão dos materiais
            </span>
            <SegmentedControl
              ariaLabel="Prontidão dos materiais"
              tamanho="sm"
              larguraTotal
              valor={form.statusMaterial || "todos"}
              onChange={(val) => setForm({ ...form, statusMaterial: val })}
              opcoes={[
                { valor: "todos", rotulo: "Todos" },
                { valor: "pronto", rotulo: "Kit pronto" },
                { valor: "pendente", rotulo: "Aguardando" },
              ]}
            />
          </div>

          <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={Boolean(form.apenasAtrasadas)}
              onChange={(e) => setForm({ ...form, apenasAtrasadas: e.target.checked })}
              className="w-4 h-4 accent-info rounded cursor-pointer"
            />
            <span className="font-medium text-foreground">
              Apenas obras atrasadas ou em assistência
            </span>
          </label>
        </section>

        <section className="p-4 space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Períodos (dd/mm/aaaa)
          </h3>

          <div className="space-y-1">
            <span className="block text-[11px] font-medium text-muted-foreground">
              Início da instalação
            </span>
            <div className="grid grid-cols-2 gap-2">
              <DateInputBR
                id={`${baseId}-inicio-de`}
                aria-label="Início a partir de"
                tamanho="sm"
                placeholder="De (dd/mm/aaaa)"
                valor={datasBR.inicioDe}
                onChange={(val) => setDatasBR({ ...datasBR, inicioDe: val })}
              />
              <DateInputBR
                id={`${baseId}-inicio-ate`}
                aria-label="Início até"
                tamanho="sm"
                placeholder="Até (dd/mm/aaaa)"
                valor={datasBR.inicioAte}
                onChange={(val) => setDatasBR({ ...datasBR, inicioAte: val })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <span className="block text-[11px] font-medium text-muted-foreground">
              Término previsto
            </span>
            <div className="grid grid-cols-2 gap-2">
              <DateInputBR
                id={`${baseId}-fim-de`}
                aria-label="Término a partir de"
                tamanho="sm"
                placeholder="De (dd/mm/aaaa)"
                valor={datasBR.fimDe}
                onChange={(val) => setDatasBR({ ...datasBR, fimDe: val })}
              />
              <DateInputBR
                id={`${baseId}-fim-ate`}
                aria-label="Término até"
                tamanho="sm"
                placeholder="Até (dd/mm/aaaa)"
                valor={datasBR.fimAte}
                onChange={(val) => setDatasBR({ ...datasBR, fimAte: val })}
              />
            </div>
          </div>
        </section>
      </form>

      <div className="px-4 py-3 border-t border-border-subtle bg-surface-subtle space-y-2 shrink-0">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLimpar}
            className="h-8 rounded-md hover:bg-muted text-foreground font-semibold shadow-none"
          >
            Limpar
          </Button>

          <Button
            type="submit"
            form={`${baseId}-form`}
            size="sm"
            className="h-8 rounded-md font-semibold shadow-none"
          >
            Aplicar filtros
          </Button>
        </div>

        {onSalvarVisaoFavorita && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSalvarFavorito}
            className="controle-compacto w-full h-7 rounded-md border-info-border bg-transparent text-info hover:bg-info-light text-[11px] font-semibold shadow-none"
          >
            Salvar como visão padrão
          </Button>
        )}
      </div>
    </Drawer>
  );
}

export default GanttFilterDrawer;
