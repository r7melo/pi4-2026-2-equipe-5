import { useId, useMemo, useRef, useState } from "react";
import { Save } from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { AlertBanner } from "@/shared/components/ui/AlertBanner";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { ComboboxPesquisavel } from "@/shared/components/ui/ComboboxPesquisavel";
import { SegmentedControl } from "@/shared/components/ui/SegmentedControl";
import type { Produto } from "@/shared/types/produtos";
import {
  TIPOS_PRODUTO_CANONICOS,
  UNIDADES_PRODUTO_CANONICAS,
  validarFormularioProduto,
  type CampoValidacaoProduto,
} from "../lib/validacaoProduto";
import { useCriarProduto, useEditarProduto } from "../hooks/useProdutos";
import { extrairMensagemErroProduto } from "../services/produtos";

export interface ModalProdutoProps {
  isOpen: boolean;
  onClose: () => void;
  produtoEdicao?: Produto | null;
  onSucesso?: (mensagem: string) => void;
}

function formatarPrecoParaCampo(preco?: number): string {
  if (typeof preco !== "number" || !Number.isFinite(preco)) return "";
  return preco.toFixed(2).replace(".", ",");
}

interface FormularioProdutoInternoProps {
  produtoEdicao?: Produto | null;
  onClose: () => void;
  onSucesso?: (mensagem: string) => void;
  salvandoChange: (salvando: boolean) => void;
}

function FormularioProdutoInterno({
  produtoEdicao,
  onClose,
  onSucesso,
  salvandoChange,
}: FormularioProdutoInternoProps) {
  const emEdicao = Boolean(produtoEdicao);
  const criarMutation = useCriarProduto();
  const editarMutation = useEditarProduto();
  const emSubmissaoRef = useRef(false);

  const [nome, setNome] = useState(produtoEdicao?.nome ?? "");
  const [tipo, setTipo] = useState(produtoEdicao?.tipo ?? "");
  const [unidade, setUnidade] = useState(produtoEdicao?.unidade ?? "un");
  const [precoUnitario, setPrecoUnitario] = useState(
    formatarPrecoParaCampo(produtoEdicao?.precoUnitario)
  );
  const [ativo, setAtivo] = useState(produtoEdicao?.ativo ?? true);
  const [erroCampo, setErroCampo] = useState<{
    campo?: CampoValidacaoProduto;
    mensagem: string;
  } | null>(null);

  const baseId = useId();
  const nomeId = `${baseId}-nome`;
  const tipoId = `${baseId}-tipo`;
  const unidadeId = `${baseId}-unidade`;
  const precoId = `${baseId}-preco`;

  const opcoesTipos = useMemo(
    () => TIPOS_PRODUTO_CANONICOS.map((item) => ({ valor: item, rotulo: item })),
    []
  );

  const opcoesUnidades = useMemo(
    () => UNIDADES_PRODUTO_CANONICAS.map((u) => ({ valor: u, rotulo: u })),
    []
  );

  const salvando = criarMutation.isPending || editarMutation.isPending;

  const focarCampo = (campo: CampoValidacaoProduto) => {
    const mapa: Record<CampoValidacaoProduto, string> = {
      nome: nomeId,
      tipo: tipoId,
      unidade: unidadeId,
      precoUnitario: precoId,
    };
    document.getElementById(mapa[campo])?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salvando || emSubmissaoRef.current) return;

    const validacao = validarFormularioProduto({
      nome,
      tipo,
      unidade,
      precoUnitario,
      ativo,
    });

    if (!validacao.ok) {
      setErroCampo(validacao.falha);
      focarCampo(validacao.falha.campo);
      return;
    }

    setErroCampo(null);
    emSubmissaoRef.current = true;
    salvandoChange(true);

    try {
      if (produtoEdicao) {
        await editarMutation.mutateAsync({
          id: produtoEdicao.id,
          payload: validacao.dados,
        });
        onSucesso?.(`Produto "${validacao.dados.nome}" atualizado com sucesso.`);
      } else {
        await criarMutation.mutateAsync(validacao.dados);
        onSucesso?.(`Produto "${validacao.dados.nome}" cadastrado no catálogo.`);
      }
      onClose();
    } catch (erro) {
      setErroCampo({
        mensagem: extrairMensagemErroProduto(
          erro,
          "Não foi possível salvar o produto no catálogo."
        ),
      });
    } finally {
      emSubmissaoRef.current = false;
      salvandoChange(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4" noValidate>
      <fieldset disabled={salvando} className="space-y-4 min-w-0">
        {erroCampo && !erroCampo.campo && (
          <AlertBanner variante="destructive" className="font-medium">
            {erroCampo.mensagem}
          </AlertBanner>
        )}

        <div className="space-y-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Especificação
          </p>

          <Input
            id={nomeId}
            label="Nome do produto"
            required
            autoFocus
            maxLength={200}
            placeholder="Ex: Painel Solar Monocristalino 550W"
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              if (erroCampo?.campo === "nome") setErroCampo(null);
            }}
            error={erroCampo?.campo === "nome" ? erroCampo.mensagem : undefined}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label
                htmlFor={tipoId}
                className="block text-sm font-semibold text-foreground-muted"
              >
                Categoria / Tipo <span aria-hidden="true" className="text-destructive ml-0.5">*</span>
              </label>
              <ComboboxPesquisavel
                id={tipoId}
                listboxAriaLabel="Categorias de produto"
                permitirTextoLivre
                compacto={false}
                opcoes={opcoesTipos}
                valorSelecionado={tipo}
                textoInicial={tipo}
                placeholder="Ex: Módulo Fotovoltaico"
                ariaInvalid={erroCampo?.campo === "tipo" || undefined}
                ariaDescribedBy={erroCampo?.campo === "tipo" ? `${tipoId}-erro` : undefined}
                onSelecionar={(valor) => {
                  if (valor) {
                    setTipo(valor);
                    if (erroCampo?.campo === "tipo") setErroCampo(null);
                  }
                }}
                onTextoChange={(texto) => {
                  setTipo(texto);
                  if (erroCampo?.campo === "tipo") setErroCampo(null);
                }}
              />
              {erroCampo?.campo === "tipo" && (
                <p id={`${tipoId}-erro`} className="text-xs text-destructive font-medium">
                  {erroCampo.mensagem}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={unidadeId}
                className="block text-sm font-semibold text-foreground-muted"
              >
                Unidade <span aria-hidden="true" className="text-destructive ml-0.5">*</span>
              </label>
              <ComboboxPesquisavel
                id={unidadeId}
                listboxAriaLabel="Unidades de medida"
                permitirTextoLivre
                compacto={false}
                opcoes={opcoesUnidades}
                valorSelecionado={unidade}
                textoInicial={unidade}
                placeholder="Ex: un, m, kit"
                ariaInvalid={erroCampo?.campo === "unidade" || undefined}
                ariaDescribedBy={erroCampo?.campo === "unidade" ? `${unidadeId}-erro` : undefined}
                onSelecionar={(valor) => {
                  if (valor) {
                    setUnidade(valor);
                    if (erroCampo?.campo === "unidade") setErroCampo(null);
                  }
                }}
                onTextoChange={(texto) => {
                  setUnidade(texto);
                  if (erroCampo?.campo === "unidade") setErroCampo(null);
                }}
              />
              {erroCampo?.campo === "unidade" && (
                <p id={`${unidadeId}-erro`} className="text-xs text-destructive font-medium">
                  {erroCampo.mensagem}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-border-subtle space-y-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Valor e disponibilidade
          </p>

          <Input
            id={precoId}
            label="Preço unitário de referência (R$)"
            required
            inputMode="decimal"
            placeholder="0,00"
            className="font-mono tabular-nums text-right"
            value={precoUnitario}
            onChange={(e) => {
              setPrecoUnitario(e.target.value);
              if (erroCampo?.campo === "precoUnitario") setErroCampo(null);
            }}
            helperText="Valor utilizado no momento da solicitação do material na obra."
            error={erroCampo?.campo === "precoUnitario" ? erroCampo.mensagem : undefined}
          />

          {emEdicao && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-subtle px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground-secondary">
                  Status no catálogo
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Itens inativos ficam ocultos em novas solicitações.
                </p>
              </div>
              <SegmentedControl
                opcoes={[
                  { valor: "ativo", rotulo: "Ativo" },
                  { valor: "inativo", rotulo: "Inativo" },
                ]}
                valor={ativo ? "ativo" : "inativo"}
                onChange={(valor) => setAtivo(valor === "ativo")}
                ariaLabel="Status do produto no catálogo"
                tamanho="xs"
              />
            </div>
          )}
        </div>

        <div className="-mx-5 -mb-5 px-5 py-3.5 border-t border-border-subtle bg-surface-subtle flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={salvando}
            className="h-10"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando} className="h-10">
            <Save className="w-4 h-4" aria-hidden="true" />
            {salvando
              ? "Salvando..."
              : emEdicao
                ? "Salvar alterações"
                : "Cadastrar produto"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}

export function ModalProduto({
  isOpen,
  onClose,
  produtoEdicao,
  onSucesso,
}: ModalProdutoProps) {
  const emEdicao = Boolean(produtoEdicao);
  const [salvando, setSalvando] = useState(false);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!salvando) onClose();
      }}
      fecharBloqueado={salvando}
      tamanho="md"
      titulo={emEdicao ? "Editar produto" : "Novo produto"}
      subtitulo={
        emEdicao
          ? "Atualize os dados comerciais ou a disponibilidade deste item."
          : "Cadastre um produto padronizado para uso nas solicitações de obra."
      }
      className="max-h-[90dvh] overflow-y-auto"
    >
      {isOpen && (
        <FormularioProdutoInterno
          key={produtoEdicao?.id ?? "novo"}
          produtoEdicao={produtoEdicao}
          onClose={onClose}
          onSucesso={onSucesso}
          salvandoChange={setSalvando}
        />
      )}
    </Modal>
  );
}

export default ModalProduto;
