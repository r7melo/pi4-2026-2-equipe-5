import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { useFiltrosUsuarios } from "../hooks/useFiltrosUsuarios";
import { useDialogosUsuarios } from "../hooks/useDialogosUsuarios";
import { usePerdaPermissao } from "../hooks/usePerdaPermissao";
import type { UsuariosProps } from "../types/gestaoUsuarios";
import { ControlesUsuarios, ControlesUsuariosMobile } from "../components/ControlesUsuarios";
import { ListaUsuarios } from "../components/ListaUsuarios";
import FormularioCadastrarUsuario from "../components/FormularioCadastrarUsuario";
import { EditorUsuario } from "../components/EditorUsuario";
import { ConfirmarStatusUsuario } from "../components/ConfirmarStatusUsuario";

export default function Usuarios({ usuarioId }: UsuariosProps) {
  const consulta = useFiltrosUsuarios();
  const { dialogo, ocupado, setOcupado, novo, abrir, fechar } = useDialogosUsuarios(consulta.lista.data);
  const [desktopFiltros, setDesktopFiltros] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(min-width: 1024px)").matches
      : true
  );
  usePerdaPermissao(consulta.lista.error, fechar);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(min-width: 1024px)");
    const atualizar = () => setDesktopFiltros(media.matches);
    atualizar();
    media.addEventListener("change", atualizar);
    return () => media.removeEventListener("change", atualizar);
  }, []);

  function concluido() { fechar(); void consulta.lista.refetch(); }

  const total = consulta.lista.data?.total;
  const controlesProps = {
    busca: consulta.busca,
    filtros: consulta.filtros,
    filtrado: consulta.filtrado,
    aoBuscar: consulta.setBusca,
    aoPerfil: consulta.mudarPerfil,
    aoStatus: consulta.mudarStatus,
    aoLimpar: consulta.limpar,
  };

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
      <PageHeader
        title="Gestão de usuários"
        badge={
          total !== undefined ? (
            <Badge variante="neutral" className="hidden sm:inline-flex font-medium tabular-nums">
              {total} {total === 1 ? "usuário" : "usuários"}
            </Badge>
          ) : undefined
        }
        extraRow={!desktopFiltros ? <ControlesUsuariosMobile {...controlesProps} /> : undefined}
      >
        {desktopFiltros && <ControlesUsuarios {...controlesProps} />}
        <Button
          ref={novo}
          size="sm"
          className="controle-compacto h-7 py-0 px-2.5 gap-1 text-xs font-medium shrink-0 whitespace-nowrap"
          onClick={e => abrir({ tipo: "cadastro" }, e.currentTarget)}
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="sm:hidden">Novo</span>
          <span className="hidden sm:inline">Novo usuário</span>
        </Button>
      </PageHeader>

      <div className="flex-1 min-w-0 overflow-y-auto p-3 sm:p-5 bg-background-app">
        <div className="max-w-6xl mx-auto space-y-3">
          <ListaUsuarios
            lista={consulta.lista}
            filtros={consulta.filtros}
            filtrado={consulta.filtrado}
            usuarioId={usuarioId}
            aoLimpar={consulta.limpar}
            aoPagina={consulta.mudarPagina}
            aoEditar={(usuario, origem) => abrir({ tipo: "edicao", usuario }, origem)}
            aoStatus={(usuario, origem) => abrir({ tipo: "status", usuario }, origem)}
          />
        </div>
      </div>

      {dialogo?.tipo === "cadastro" && (
        <Modal
          isOpen
          titulo="Cadastrar usuário"
          subtitulo="Defina acesso e senha inicial para o novo colaborador."
          tamanho="md"
          onClose={fechar}
          fecharBloqueado={ocupado}
          className="max-h-[90dvh] overflow-y-auto"
        >
          <FormularioCadastrarUsuario emModal onCancelar={fechar} onConcluido={concluido} onSemPermissao={fechar} onOcupado={setOcupado} />
        </Modal>
      )}
      {dialogo?.tipo === "edicao" && <EditorUsuario usuario={dialogo.usuario} proprio={dialogo.usuario.id === usuarioId} onFechar={fechar} onConcluido={concluido} />}
      {dialogo?.tipo === "status" && <ConfirmarStatusUsuario usuario={dialogo.usuario} onFechar={fechar} onConcluido={concluido} />}
    </div>
  );
}
