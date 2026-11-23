import { useId, useRef, useState } from "react";
import { Save } from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
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
  const listaTiposId = `${baseId}-lista-tipos`;
  const unidadeId = `${baseId}-unidade`;
  const listaUnidadesId = `${baseId}-lista-unidades`;
  const precoId = `${baseId}-preco`;
  const ativoId = `${baseId}-ativo`;

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
    <form onSubmit={handleSubmit} className="p-6 space-y-5" noValidate>
      {erroCampo && !erroCampo.campo && (
        <div
          role="alert"
          className="rounded-lg border border-destructive-border bg-destructive-light/60 px-3.5 py-2.5 text-xs font-medium text-destructive"
        >
          {erroCampo.mensagem}
        </div>
      )}

      <Input
        id={nomeId}
        label="Nome do produto"
        required
        autoFocus
        maxLength={200}
        placeholder="Ex: Painel Solar Monocristalino 550W"
        value={nome}
        disabled={salvando}
        onChange={(e) => {
          setNome(e.target.value);
          if (erroCampo?.campo === "nome") setErroCampo(null);
        }}
        error={erroCampo?.campo === "nome" ? erroCampo.mensagem : undefined}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Input
            id={tipoId}
            list={listaTiposId}
            label="Categoria / Tipo"
            required
            maxLength={200}
            placeholder="Ex: Módulo Fotovoltaico"
            value={tipo}
            disabled={salvando}
            onChange={(e) => {
              setTipo(e.target.value);
              if (erroCampo?.campo === "tipo") setErroCampo(null);
            }}
            error={erroCampo?.campo === "tipo" ? erroCampo.mensagem : undefined}
          />
          <datalist id={listaTiposId}>
            {TIPOS_PRODUTO_CANONICOS.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </div>

        <div>
          <Input
            id={unidadeId}
            list={listaUnidadesId}
            label="Unidade"
            required
            maxLength={30}
            placeholder="Ex: un, m, kit"
            value={unidade}
            disabled={salvando}
            onChange={(e) => {
              setUnidade(e.target.value);
              if (erroCampo?.campo === "unidade") setErroCampo(null);
            }}
            error={erroCampo?.campo === "unidade" ? erroCampo.mensagem : undefined}
          />
          <datalist id={listaUnidadesId}>
            {UNIDADES_PRODUTO_CANONICAS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </div>
      </div>

      <Input
        id={precoId}
        label="Preço unitário de referência (R$)"
        required
        inputMode="decimal"
        placeholder="0,00"
        className="font-mono text-right"
        value={precoUnitario}
        disabled={salvando}
        onChange={(e) => {
          setPrecoUnitario(e.target.value);
          if (erroCampo?.campo === "precoUnitario") setErroCampo(null);
        }}
        helperText="Valor utilizado no momento da solicitação do material na obra."
        error={erroCampo?.campo === "precoUnitario" ? erroCampo.mensagem : undefined}
      />

      {emEdicao && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-subtle px-4 py-3">
          <div>
            <label
              htmlFor={ativoId}
              className="block text-sm font-semibold text-foreground-secondary cursor-pointer"
            >
              Produto ativo no catálogo
            </label>
            <p className="text-xs text-muted-foreground">
              Produtos inativos ficam indisponíveis para novas solicitações.
            </p>
          </div>
          <input
            id={ativoId}
            type="checkbox"
            checked={ativo}
            disabled={salvando}
            onChange={(e) => setAtivo(e.target.checked)}
            className="h-4 w-4 rounded border-border-strong text-primary focus:ring-border-strong cursor-pointer"
          />
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-border-subtle">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={salvando}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          <Save className="w-4 h-4" />
          {salvando
            ? "Salvando..."
            : emEdicao
              ? "Salvar alterações"
              : "Cadastrar produto"}
        </Button>
      </div>
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
      titulo={emEdicao ? "Editar produto" : "Novo produto no catálogo"}
      subtitulo={
        emEdicao
          ? "Atualize os dados comerciais ou a disponibilidade deste item."
          : "Cadastre um produto padronizado para uso nas solicitações de obra."
      }
      className="max-w-lg"
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
