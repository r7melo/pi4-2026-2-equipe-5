import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { toast } from "sonner";
import {
  DollarSign,
  HardHat,
  Package,
  AlertCircle,
  Building2,
  Calculator,
  Loader2,
} from "lucide-react";
import { useAtualizarCustosObra } from "../hooks/useRelatorios";
import { formatarMoeda } from "@/shared/lib/formatters";
import {
  capturarSessaoOperacional,
  deveExibirErroLocal,
  erroDaSessaoAnterior,
  sessaoOperacionalVigente,
} from "@/shared/lib/sessaoOperacao";
import {
  contextoDemonstracao,
  contextoDemonstracaoVigente,
} from "@/shared/lib/contextoDemonstracao";
import {
  MENSAGEM_ERRO_ENVIO_CUSTOS,
  calcularPreviaMargem,
  extrairMensagemErroApi,
  validarEConstruirPayloadCustos,
} from "../lib/apuracaoDre";
import type { CustosObra } from "@/shared/types/relatorios";

interface ModalLancamentoCustosProps {
  isOpen: boolean;
  onClose: () => void;
  obraId: number;
  clienteNome: string;
  custosAtuais?: CustosObra | null;
}

interface FormValores {
  valorObra: string;
  custoMaoObra: string;
  custoInsumos: string;
}

interface FormularioLancamentoCustosProps {
  obraId: number;
  clienteNome: string;
  custosAtuais?: CustosObra | null;
  salvando: boolean;
  onIniciarTentativa: () => number | null;
  onIniciarSalvamento: (tentativaId: number) => void;
  onEncerrarTentativa: (tentativaId: number) => void;
  onSolicitarFechamentoUsuario: () => void;
  onFecharProgramatico: () => void;
  onLimparAoDesmontar: () => void;
}

function FormularioLancamentoCustos({
  obraId,
  clienteNome,
  custosAtuais,
  salvando,
  onIniciarTentativa,
  onIniciarSalvamento,
  onEncerrarTentativa,
  onSolicitarFechamentoUsuario,
  onFecharProgramatico,
  onLimparAoDesmontar,
}: FormularioLancamentoCustosProps) {
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  const atualizarCustos = useAtualizarCustosObra(obraId);
  const montadoRef = useRef(true);

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
      onLimparAoDesmontar();
    };
  }, [onLimparAoDesmontar]);

  const { register, handleSubmit, control, reset } = useForm<FormValores>({
    defaultValues: {
      valorObra: custosAtuais?.valorObra != null ? String(custosAtuais.valorObra) : "",
      custoMaoObra: custosAtuais?.custoMaoObra != null ? String(custosAtuais.custoMaoObra) : "",
      custoInsumos: custosAtuais?.custoInsumos != null ? String(custosAtuais.custoInsumos) : "",
    },
  });

  const valoresObservados = useWatch({ control });
  const previa = calcularPreviaMargem(obraId, {
    valorObra: valoresObservados?.valorObra,
    custoMaoObra: valoresObservados?.custoMaoObra,
    custoInsumos: valoresObservados?.custoInsumos,
  });

  const onValid = async (dados: FormValores, tentativaId: number) => {
    setErroValidacao(null);
    const validacao = validarEConstruirPayloadCustos(dados, custosAtuais);
    if (!validacao.ok) {
      setErroValidacao(validacao.erro);
      return;
    }

    const sessao = capturarSessaoOperacional();
    const origem = contextoDemonstracao();
    onIniciarSalvamento(tentativaId);

    try {
      await atualizarCustos.mutateAsync(validacao.payload, undefined, sessao);
      if (
        !montadoRef.current ||
        !sessaoOperacionalVigente(sessao) ||
        !contextoDemonstracaoVigente(origem)
      ) {
        return;
      }
      toast.success("Custos e valores da obra atualizados com sucesso!");
      reset();
      onFecharProgramatico();
    } catch (erro) {
      if (
        !montadoRef.current ||
        !sessaoOperacionalVigente(sessao) ||
        !contextoDemonstracaoVigente(origem) ||
        erroDaSessaoAnterior(erro)
      ) {
        return;
      }
      if (!deveExibirErroLocal(erro)) {
        onFecharProgramatico();
        return;
      }
      setErroValidacao(extrairMensagemErroApi(erro, MENSAGEM_ERRO_ENVIO_CUSTOS));
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const tentativaId = onIniciarTentativa();
    if (tentativaId == null) return;
    void handleSubmit((dados) => onValid(dados, tentativaId))(e).finally(() => {
      onEncerrarTentativa(tentativaId);
    });
  };

  return (
    <form noValidate onSubmit={handleFormSubmit} className="p-6 space-y-5">
      {/* Banner de Contexto Operacional */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-subtle border border-border-subtle text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-surface border border-border-subtle text-foreground-muted shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">{clienteNome}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Identificador do Contrato: #{obraId}
            </p>
          </div>
        </div>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-surface border border-border-subtle text-foreground-secondary shrink-0">
          Apuração DRE
        </span>
      </div>

      {erroValidacao && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-destructive-light border border-destructive-border text-destructive flex items-center gap-2.5 text-xs"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{erroValidacao}</span>
        </div>
      )}

      {/* Campo Principal: Receita Contratual */}
      <div>
        <label
          htmlFor="input-valor-obra"
          className="block text-xs font-semibold text-foreground-secondary mb-1.5 uppercase tracking-wide"
        >
          Valor do Contrato / Obra (R$)
        </label>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1 text-muted-foreground">
            <DollarSign className="w-4 h-4 text-foreground-muted" />
            <span className="text-xs font-bold font-mono">R$</span>
          </div>
          <Input
            id="input-valor-obra"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            disabled={salvando}
            className="pl-14 font-mono text-sm"
            {...register("valorObra")}
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          Receita bruta negociada junto ao cliente da obra para a apuração da DRE.
        </p>
      </div>

      {/* Grid de Custos Diretos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="input-custo-mao-obra"
            className="block text-xs font-semibold text-foreground-secondary mb-1.5 uppercase tracking-wide"
          >
            Mão de Obra (R$)
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1 text-muted-foreground">
              <HardHat className="w-4 h-4 text-foreground-muted" />
              <span className="text-xs font-bold font-mono">R$</span>
            </div>
            <Input
              id="input-custo-mao-obra"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              disabled={salvando}
              className="pl-14 font-mono text-sm"
              {...register("custoMaoObra")}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Pagamentos a instaladores e terceiros.
          </p>
        </div>

        <div>
          <label
            htmlFor="input-custo-insumos"
            className="block text-xs font-semibold text-foreground-secondary mb-1.5 uppercase tracking-wide"
          >
            Insumos e Peças (R$)
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1 text-muted-foreground">
              <Package className="w-4 h-4 text-foreground-muted" />
              <span className="text-xs font-bold font-mono">R$</span>
            </div>
            <Input
              id="input-custo-insumos"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              disabled={salvando}
              className="pl-14 font-mono text-sm"
              {...register("custoInsumos")}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Cabos, fixadores e complementos.
          </p>
        </div>
      </div>

      {/* Quadro de Apuração Estimada em Tempo Real */}
      <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle">
        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-border-subtle">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground-muted flex items-center gap-2">
            <Calculator className="w-4 h-4 text-foreground-muted" />
            Prévia da Margem Operacional
          </span>
          <span aria-live="polite" className="text-xs font-semibold text-muted-foreground">
            {previa.textoMargem}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-[11px] text-muted-foreground">Custos Totais Lançados</p>
            <p className="font-mono font-bold text-sm text-foreground mt-0.5">
              {formatarMoeda(previa.custoTotal)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Margem Bruta Estimada</p>
            <p
              className={`font-mono font-bold text-sm mt-0.5 ${
                previa.resultado >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {formatarMoeda(previa.resultado)}
            </p>
          </div>
        </div>
      </div>

      {/* Ações do Rodapé */}
      <div className="pt-4 border-t border-border-subtle flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onSolicitarFechamentoUsuario}
          disabled={salvando}
          className="cursor-pointer"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={salvando}
          className="flex items-center gap-2 cursor-pointer"
        >
          {salvando ? (
            <>
              <Loader2 className="w-4 h-4 motion-safe:animate-spin" />
              <span>Gravando...</span>
            </>
          ) : (
            "Salvar Valores"
          )}
        </Button>
      </div>
    </form>
  );
}

export function ModalLancamentoCustos({
  isOpen,
  onClose,
  obraId,
  clienteNome,
  custosAtuais,
}: ModalLancamentoCustosProps) {
  const [salvando, setSalvando] = useState(false);
  const travaEnvioRef = useRef(false);
  const tentativaAtivaRef = useRef(0);

  const solicitarFechamentoUsuario = useCallback(() => {
    if (salvando || travaEnvioRef.current) return;
    setSalvando(false);
    onClose();
  }, [salvando, onClose]);

  const fecharProgramatico = useCallback(() => {
    setSalvando(false);
    onClose();
  }, [onClose]);

  const iniciarTentativa = useCallback(() => {
    if (travaEnvioRef.current) return null;
    tentativaAtivaRef.current += 1;
    travaEnvioRef.current = true;
    return tentativaAtivaRef.current;
  }, []);

  const iniciarSalvamento = useCallback((tentativaId: number) => {
    if (tentativaAtivaRef.current !== tentativaId) return;
    setSalvando(true);
  }, []);

  const encerrarTentativa = useCallback((tentativaId: number) => {
    if (tentativaAtivaRef.current !== tentativaId) return;
    travaEnvioRef.current = false;
    setSalvando(false);
  }, []);

  const limparAoDesmontar = useCallback(() => {
    tentativaAtivaRef.current += 1;
    travaEnvioRef.current = false;
    setSalvando(false);
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={solicitarFechamentoUsuario}
      fecharBloqueado={isOpen && salvando}
      titulo="Lançamento de Custos e Valor da Obra"
      subtitulo={`Obra #${obraId} • Cliente: ${clienteNome}`}
      icone={
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
          <DollarSign className="w-5 h-5" />
        </div>
      }
      className="max-w-xl"
    >
      {isOpen && (
        <FormularioLancamentoCustos
          key={obraId}
          obraId={obraId}
          clienteNome={clienteNome}
          custosAtuais={custosAtuais}
          salvando={salvando}
          onIniciarTentativa={iniciarTentativa}
          onIniciarSalvamento={iniciarSalvamento}
          onEncerrarTentativa={encerrarTentativa}
          onSolicitarFechamentoUsuario={solicitarFechamentoUsuario}
          onFecharProgramatico={fecharProgramatico}
          onLimparAoDesmontar={limparAoDesmontar}
        />
      )}
    </Modal>
  );
}
