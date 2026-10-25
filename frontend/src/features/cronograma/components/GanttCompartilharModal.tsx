import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { GanttCompartilharModalProps, PeriodoCompartilhado } from "@/types";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
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
    if (!periodoCivilValido(periodo.dataInicio, periodo.dataFim)) {
      setValidacao("Informe início e fim válidos, com o fim igual ou posterior ao início.");
      return;
    }
    setValidacao("");
    setCopiado(false);
    setAvisoManual("");
    linkAtual.current = undefined;
    geracao.gerar({ ...periodo });
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
      await navigator.clipboard.writeText(resultado.url);
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
    <Modal isOpen onClose={fechar} titulo="Compartilhar cronograma"
      subtitulo="Consulta pública por período" ariaLabelledBy={id + "-titulo"}
      fecharBloqueado={pendente} gerenciarFoco
      className="flex max-h-[calc(100dvh-2rem)] max-w-lg flex-col [&>div:first-child]:shrink-0">
      <form noValidate onSubmit={evento => { evento.preventDefault(); gerar(); }}
        className="flex min-h-0 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">O link compartilha as alocações de todas as equipes no período escolhido.</p>
        <p className="text-sm text-muted-foreground">Qualquer pessoa com o link poderá consultar este período, sem fazer login.</p>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <Input id={id + "-inicio"} label="Data inicial" type="date" required data-autofocus
            value={periodo.dataInicio} disabled={pendente} className="focus:ring-info"
            onChange={evento => editar("dataInicio", evento.target.value)}
            aria-describedby={validacao ? id + "-erro" : undefined} />
          <Input id={id + "-fim"} label="Data final" type="date" required
            value={periodo.dataFim} disabled={pendente} className="focus:ring-info"
            onChange={evento => editar("dataFim", evento.target.value)}
            aria-describedby={validacao ? id + "-erro" : undefined} />
        </div>
        {validacao && <p id={id + "-erro"} role="alert" className="text-sm text-destructive">{validacao}</p>}
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          {pendente ? "Gerando link..." : resultado ? (expirado ? "Este link expirou. Gere um novo link." : "Link disponível para copiar.") : "Escolha o período e gere o link."}
        </p>
        {resultado && !pendente && (
          <div className="flex min-w-0 flex-col gap-3">
            <p className="text-sm text-foreground-secondary">Período: {formatarDataBR(periodo.dataInicio)} a {formatarDataBR(periodo.dataFim)}</p>
            <Input ref={campoLink} id={id + "-link"} label="Link público" readOnly
              value={resultado.url} className="min-w-0 select-all font-mono focus:ring-info" />
            <p className="text-sm text-muted-foreground">Válido até {new Intl.DateTimeFormat("pt-BR", {
              dateStyle: "short", timeStyle: "short",
            }).format(new Date(resultado.expiraEm))} ({new Intl.DateTimeFormat().resolvedOptions().timeZone})</p>
            {!expirado && (
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => { void copiar(); }} variant="outline" className="focus-visible:ring-info">
                  {copiado ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
                  {copiado ? "Copiado" : "Copiar link"}
                </Button>
                <a href={resultado.url} target="_blank" rel="noopener noreferrer"
                  onClick={evento => { if (!podeUsarLink()) evento.preventDefault(); }}
                  className="inline-flex items-center gap-2 rounded text-sm text-info underline focus-visible:outline-2 focus-visible:outline-info">
                  <ExternalLink aria-hidden="true" className="size-4" />Abrir cronograma
                </a>
              </div>
            )}
            {avisoManual && <p role="status" className="text-sm text-muted-foreground">{avisoManual}</p>}
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-3 border-t border-border-subtle pt-4">
          <Button onClick={fechar} disabled={pendente} variant="secondary" className="focus-visible:ring-info">Fechar</Button>
          <Button type="submit" disabled={pendente} className="focus-visible:ring-info">{pendente ? "Gerando..." : resultado ? "Gerar novo link" : "Gerar link"}</Button>
        </div>
      </form>
    </Modal>
  );
}
