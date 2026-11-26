import { contextoDemonstracao, executarEfeitoDemonstracao } from "@/shared/lib/contextoDemonstracao";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import type { PeriodoCompartilhado } from "@/shared/types/compartilhamentoCronograma";
import type { GanttCompartilharModalProps } from "../types/compartilhamento";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { DateInputBR } from "@/shared/components/ui/DateInputBR";
import {
  dataBRParaIso,
  isoParaDataBR,
} from "@/shared/lib/datasBrasileiras";
import { periodoCivilValido } from "@/shared/lib/datasCivis";
import { formatarDataBR } from "@/shared/lib/formatters";
import { useCompartilharCronograma } from "@/features/cronograma/hooks/useCompartilharCronograma";
import { periodoMesAtual } from "@/features/cronograma/lib/compartilhamento";

function interacaoBloqueada() { return false; }

/** Cada abertura monta um formulário novo; resultados antigos não entram no próximo fluxo. */
export function GanttCompartilharModal(props: GanttCompartilharModalProps) {
  return props.isOpen ? <FormularioCompartilhamento {...props} /> : null;
}

function FormularioCompartilhamento({ onClose, podeInteragir = interacaoBloqueada }: GanttCompartilharModalProps) {
  const id = useId();
  const [periodo, setPeriodo] = useState<PeriodoCompartilhado>(periodoMesAtual);
  const [textoInicio, setTextoInicio] = useState(() => isoParaDataBR(periodo.dataInicio));
  const [textoFim, setTextoFim] = useState(() => isoParaDataBR(periodo.dataFim));
  const [validacao, setValidacao] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [avisoManual, setAvisoManual] = useState("");
  const [agora, atualizarRelogio] = useState(Date.now);
  const campoLink = useRef<HTMLInputElement>(null);
  const copiando = useRef(false);
  const geracao = useCompartilharCronograma(podeInteragir);
  const resultado = geracao.data;
  const linkAtual = useRef(resultado);
  useLayoutEffect(() => { linkAtual.current = resultado; }, [resultado]);
  const pendente = geracao.isPending;
  const expirado = Boolean(resultado && Math.max(agora, resultado.recebidoEm) >= Date.parse(resultado.expiraEm));

  useEffect(() => {
    if (!resultado) return;
    let timer: ReturnType<typeof setTimeout>;
    const agendar = () => {
      const restante = Date.parse(resultado.expiraEm) - Date.now();
      timer = setTimeout(() => {
        atualizarRelogio(Date.now());
        if (Date.now() < Date.parse(resultado.expiraEm)) agendar();
      }, Math.min(Math.max(restante, 0), 2147483647));
    };
    agendar();
    return () => clearTimeout(timer);
  }, [resultado]);

  const fechar = () => {
    if (!geracao.estaEnviando() && geracao.podeAgir()) onClose();
  };
  function editar(campo: keyof PeriodoCompartilhado, valor: string) {
    if (!geracao.podeAgir() || geracao.estaEnviando()) return;
    linkAtual.current = undefined;
    setPeriodo(anterior => ({ ...anterior, [campo]: valor }));
    setValidacao("");
    setCopiado(false);
    setAvisoManual("");
    geracao.reset();
  }
  function gerar() {
    if (!geracao.podeAgir() || geracao.estaEnviando()) return;
    const isoInicio = dataBRParaIso(textoInicio);
    const isoFim = dataBRParaIso(textoFim);
    if (!isoInicio || !isoFim || !periodoCivilValido(isoInicio, isoFim)) {
      setValidacao("Informe início e fim válidos em dd/mm/aaaa, com o fim igual ou posterior ao início.");
      return;
    }
    const periodoValido: PeriodoCompartilhado = { dataInicio: isoInicio, dataFim: isoFim };
    setPeriodo(periodoValido);
    setValidacao("");
    setCopiado(false);
    setAvisoManual("");
    linkAtual.current = undefined;
    geracao.gerar(periodoValido);
  }
  function podeUsarLink() {
    return geracao.podeAgir() && !geracao.estaEnviando() && resultado && resultado === linkAtual.current &&
      Date.now() < Date.parse(resultado.expiraEm);
  }
  async function copiar() {
    if (!podeUsarLink() || !resultado || copiando.current) return;
    copiando.current = true;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Cópia automática indisponível.");
      await executarEfeitoDemonstracao(contextoDemonstracao(), async () => {
        if (!podeUsarLink()) return;
        await navigator.clipboard.writeText(resultado.url);
      });
      if (!geracao.podeAgir() || resultado !== linkAtual.current) return;
      setCopiado(true);
      setAvisoManual("");
      toast.success("Link copiado.");
    } catch {
      if (!geracao.podeAgir() || resultado !== linkAtual.current) return;
      campoLink.current?.focus();
      campoLink.current?.select();
      setAvisoManual("Selecione o link e use a opção Copiar do seu dispositivo.");
    } finally {
      copiando.current = false;
    }
  }

  return (
    <Modal
      isOpen
      onClose={fechar}
      titulo="Compartilhar cronograma"
      subtitulo="Qualquer pessoa com o link consulta o período escolhido sem fazer login."
      ariaLabelledBy={id + "-titulo"}
      fecharBloqueado={pendente}
      className="flex max-h-[calc(100dvh-2rem)] max-w-md flex-col [&>div:first-child]:shrink-0"
    >
      <form
        noValidate
        onSubmit={evento => { evento.preventDefault(); gerar(); }}
        className="flex min-h-0 flex-col gap-4 overflow-y-auto p-5 text-xs"
      >
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor={id + "-inicio"} className="block font-semibold text-foreground-secondary">
              Data inicial *
            </label>
            <DateInputBR
              id={id + "-inicio"}
              tamanho="md"
              required
              data-autofocus
              valor={textoInicio}
              disabled={pendente}
              onChange={mascarado => {
                setTextoInicio(mascarado);
                const iso = mascarado.length === 10 ? dataBRParaIso(mascarado) : undefined;
                editar("dataInicio", iso ?? "");
              }}
              aria-describedby={validacao ? id + "-erro" : undefined}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor={id + "-fim"} className="block font-semibold text-foreground-secondary">
              Data final *
            </label>
            <DateInputBR
              id={id + "-fim"}
              tamanho="md"
              required
              valor={textoFim}
              disabled={pendente}
              onChange={mascarado => {
                setTextoFim(mascarado);
                const iso = mascarado.length === 10 ? dataBRParaIso(mascarado) : undefined;
                editar("dataFim", iso ?? "");
              }}
              aria-describedby={validacao ? id + "-erro" : undefined}
            />
          </div>
        </div>

        {validacao && <p id={id + "-erro"} role="alert" className="text-xs font-medium text-destructive">{validacao}</p>}

        <div className="flex items-center justify-between gap-2 py-2.5 border-y border-border-subtle">
          <div role="status" aria-live="polite" className="min-w-0 text-muted-foreground tabular-nums">
            {pendente ? (
              <span>Gerando link público...</span>
            ) : resultado ? (
              expirado ? (
                <span className="text-warning font-medium">Este link expirou. Gere um novo link.</span>
              ) : (
                <span>
                  Período: {formatarDataBR(periodo.dataInicio)} a {formatarDataBR(periodo.dataFim)} · Válido até{" "}
                  {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(resultado.expiraEm))}
                </span>
              )
            ) : (
              <span>Escolha o período e gere o link.</span>
            )}
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={pendente}
            className="h-8 rounded-md font-semibold shadow-none shrink-0"
          >
            {pendente ? "Gerando..." : resultado ? "Gerar novo link" : "Gerar link"}
          </Button>
        </div>

        {resultado && !pendente && !expirado && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <input
                ref={campoLink}
                id={id + "-link"}
                aria-label="Link público"
                type="text"
                readOnly
                value={resultado.url}
                className="flex-1 min-w-0 h-9 rounded-lg border border-border-subtle bg-surface-subtle px-2.5 font-mono text-[11px] text-foreground-muted select-all"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { void copiar(); }}
                className="h-9 text-foreground hover:bg-surface-subtle font-semibold shadow-none shrink-0"
              >
                {copiado ? <Check aria-hidden="true" className="w-3.5 h-3.5 text-success" /> : <Copy aria-hidden="true" className="w-3.5 h-3.5" />}
                <span>{copiado ? "Copiado" : "Copiar"}</span>
              </Button>
            </div>
            {avisoManual && <p role="status" className="text-[11px] text-muted-foreground">{avisoManual}</p>}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          {resultado && !pendente && !expirado ? (
            <a
              href={resultado.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={evento => { if (!podeUsarLink()) evento.preventDefault(); }}
              className="text-xs font-semibold text-info hover:underline"
            >
              Abrir visão pública agora →
            </a>
          ) : (
            <span />
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fechar}
            disabled={pendente}
            className="h-8 border-border-subtle hover:bg-muted text-foreground shadow-none"
          >
            Fechar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
