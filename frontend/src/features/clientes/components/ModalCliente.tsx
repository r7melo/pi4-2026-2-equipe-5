import { useId, useRef, useState } from "react";
import { Save } from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { AlertBanner } from "@/shared/components/ui/AlertBanner";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import {
  formatarCpfCnpj,
  formatarTelefone,
} from "@/shared/lib/validacoesDocumento";
import type { Cliente } from "@/shared/types/clientes";
import {
  validarFormularioCliente,
  type CampoValidacaoCliente,
} from "../lib/validacaoCliente";
import { useCriarCliente, useEditarCliente } from "../hooks/useClientes";
import { extrairMensagemErroCliente } from "../services/clientes";

export interface ModalClienteProps {
  isOpen: boolean;
  onClose: () => void;
  clienteEdicao?: Cliente | null;
  onSucesso?: (mensagem: string) => void;
}

interface FormularioClienteInternoProps {
  clienteEdicao?: Cliente | null;
  onClose: () => void;
  onSucesso?: (mensagem: string) => void;
  salvandoChange: (salvando: boolean) => void;
}

function FormularioClienteInterno({
  clienteEdicao,
  onClose,
  onSucesso,
  salvandoChange,
}: FormularioClienteInternoProps) {
  const emEdicao = Boolean(clienteEdicao);
  const criarMutation = useCriarCliente();
  const editarMutation = useEditarCliente();
  const emSubmissaoRef = useRef(false);

  const [nome, setNome] = useState(clienteEdicao?.nome ?? "");
  const [cpfCnpj, setCpfCnpj] = useState(
    clienteEdicao?.cpfCnpj ? formatarCpfCnpj(clienteEdicao.cpfCnpj) : ""
  );
  const [cidade, setCidade] = useState(clienteEdicao?.cidade ?? "");
  const [endereco, setEndereco] = useState(clienteEdicao?.endereco ?? "");
  const [telefone, setTelefone] = useState(
    clienteEdicao?.telefone ? formatarTelefone(clienteEdicao.telefone) : ""
  );
  const [email, setEmail] = useState(clienteEdicao?.email ?? "");
  const [erroCampo, setErroCampo] = useState<{
    campo?: CampoValidacaoCliente;
    mensagem: string;
  } | null>(null);

  const baseId = useId();
  const nomeId = `${baseId}-nome`;
  const cpfCnpjId = `${baseId}-cpfcnpj`;
  const cidadeId = `${baseId}-cidade`;
  const enderecoId = `${baseId}-endereco`;
  const telefoneId = `${baseId}-telefone`;
  const emailId = `${baseId}-email`;

  const salvando = criarMutation.isPending || editarMutation.isPending;

  const focarCampo = (campo: CampoValidacaoCliente) => {
    const mapa: Record<CampoValidacaoCliente, string> = {
      nome: nomeId,
      cpfCnpj: cpfCnpjId,
      cidade: cidadeId,
      endereco: enderecoId,
      telefone: telefoneId,
      email: emailId,
    };
    document.getElementById(mapa[campo])?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salvando || emSubmissaoRef.current) return;

    const validacao = validarFormularioCliente({
      nome,
      cpfCnpj,
      cidade,
      endereco,
      telefone,
      email,
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
      if (clienteEdicao) {
        await editarMutation.mutateAsync({
          id: clienteEdicao.id,
          payload: validacao.dados,
        });
        onSucesso?.(`Cliente "${validacao.dados.nome}" atualizado com sucesso.`);
      } else {
        await criarMutation.mutateAsync(validacao.dados);
        onSucesso?.(`Cliente "${validacao.dados.nome}" cadastrado com sucesso.`);
      }
      onClose();
    } catch (erro) {
      setErroCampo({
        mensagem: extrairMensagemErroCliente(
          erro,
          "Não foi possível salvar os dados do cliente."
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
            Identificação
          </p>

          <Input
            id={nomeId}
            label="Nome completo ou Razão Social"
            required
            autoFocus
            maxLength={200}
            placeholder="Ex: Rede Alfa Supermercados"
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              if (erroCampo?.campo === "nome") setErroCampo(null);
            }}
            error={erroCampo?.campo === "nome" ? erroCampo.mensagem : undefined}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              id={cpfCnpjId}
              label="CPF / CNPJ"
              required
              inputMode="numeric"
              maxLength={18}
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              className="font-mono tabular-nums"
              value={cpfCnpj}
              onChange={(e) => {
                setCpfCnpj(formatarCpfCnpj(e.target.value));
                if (erroCampo?.campo === "cpfCnpj") setErroCampo(null);
              }}
              error={erroCampo?.campo === "cpfCnpj" ? erroCampo.mensagem : undefined}
            />

            <Input
              id={telefoneId}
              label="Telefone / WhatsApp"
              inputMode="tel"
              maxLength={30}
              placeholder="(88) 99999-0000"
              className="font-mono tabular-nums"
              value={telefone}
              onChange={(e) => {
                setTelefone(formatarTelefone(e.target.value));
                if (erroCampo?.campo === "telefone") setErroCampo(null);
              }}
              error={erroCampo?.campo === "telefone" ? erroCampo.mensagem : undefined}
            />
          </div>
        </div>

        <div className="pt-3 border-t border-border-subtle space-y-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Contato e localização
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              id={cidadeId}
              label="Cidade"
              maxLength={100}
              placeholder="Ex: Crateús"
              value={cidade}
              onChange={(e) => {
                setCidade(e.target.value);
                if (erroCampo?.campo === "cidade") setErroCampo(null);
              }}
              error={erroCampo?.campo === "cidade" ? erroCampo.mensagem : undefined}
            />

            <Input
              id={emailId}
              type="email"
              label="E-mail"
              maxLength={200}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="contato@empresa.com.br"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (erroCampo?.campo === "email") setErroCampo(null);
              }}
              error={erroCampo?.campo === "email" ? erroCampo.mensagem : undefined}
            />
          </div>

          <Input
            id={enderecoId}
            label="Endereço completo"
            maxLength={255}
            placeholder="Ex: Av. Sargento Hermínio, 1200 - Centro"
            value={endereco}
            onChange={(e) => {
              setEndereco(e.target.value);
              if (erroCampo?.campo === "endereco") setErroCampo(null);
            }}
            error={erroCampo?.campo === "endereco" ? erroCampo.mensagem : undefined}
          />
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
                : "Cadastrar cliente"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}

export function ModalCliente({
  isOpen,
  onClose,
  clienteEdicao,
  onSucesso,
}: ModalClienteProps) {
  const emEdicao = Boolean(clienteEdicao);
  const [salvando, setSalvando] = useState(false);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!salvando) onClose();
      }}
      fecharBloqueado={salvando}
      tamanho="md"
      titulo={emEdicao ? "Editar cliente" : "Novo cliente"}
      subtitulo={
        emEdicao
          ? "Atualize os dados cadastrais e de contato do cliente."
          : "Cadastre um cliente para vincular a novas obras e projetos."
      }
      className="max-h-[90dvh] overflow-y-auto"
    >
      {isOpen && (
        <FormularioClienteInterno
          key={clienteEdicao?.id ?? "novo"}
          clienteEdicao={clienteEdicao}
          onClose={onClose}
          onSucesso={onSucesso}
          salvandoChange={setSalvando}
        />
      )}
    </Modal>
  );
}

export default ModalCliente;
