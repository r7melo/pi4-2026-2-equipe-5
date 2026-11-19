import { PageHeader } from "@/shared/components/ui/PageHeader";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { useFiltrosUsuarios } from "../hooks/useFiltrosUsuarios";
import { useDialogosUsuarios } from "../hooks/useDialogosUsuarios";
import { usePerdaPermissao } from "../hooks/usePerdaPermissao";
import type { UsuariosProps } from "../types/gestaoUsuarios";
import { ControlesUsuarios } from "../components/ControlesUsuarios";
import { ListaUsuarios } from "../components/ListaUsuarios";
import FormularioCadastrarUsuario from "../components/FormularioCadastrarUsuario";
import { EditorUsuario } from "../components/EditorUsuario";
import { ConfirmarStatusUsuario } from "../components/ConfirmarStatusUsuario";

export default function Usuarios({ usuarioId }: UsuariosProps) {
  const consulta = useFiltrosUsuarios();
  const { dialogo, ocupado, setOcupado, novo, abrir, fechar } = useDialogosUsuarios(consulta.lista.data);
  usePerdaPermissao(consulta.lista.error, fechar);
  function concluido() { fechar(); void consulta.lista.refetch(); }
  return <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
    <PageHeader title="Gestão de usuários" ><Button ref={novo} onClick={e => abrir({ tipo: "cadastro" }, e.currentTarget)}>Novo usuário</Button></PageHeader>
    <div className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6 bg-background-app space-y-4">
      <ControlesUsuarios busca={consulta.busca} filtros={consulta.filtros} filtrado={consulta.filtrado}
        aoBuscar={consulta.setBusca} aoPerfil={consulta.mudarPerfil} aoStatus={consulta.mudarStatus} aoLimpar={consulta.limpar} />
      <ListaUsuarios lista={consulta.lista} filtros={consulta.filtros} filtrado={consulta.filtrado} usuarioId={usuarioId}
        aoLimpar={consulta.limpar} aoPagina={consulta.mudarPagina}
        aoEditar={(usuario, origem) => abrir({ tipo: "edicao", usuario }, origem)}
        aoStatus={(usuario, origem) => abrir({ tipo: "status", usuario }, origem)} />
    </div>
    {dialogo?.tipo === "cadastro" && <Modal isOpen titulo="Cadastrar usuário" onClose={fechar} fecharBloqueado={ocupado} className="max-h-[90dvh] overflow-y-auto"><FormularioCadastrarUsuario onConcluido={concluido} onSemPermissao={fechar} onOcupado={setOcupado} /></Modal>}
    {dialogo?.tipo === "edicao" && <EditorUsuario usuario={dialogo.usuario} proprio={dialogo.usuario.id === usuarioId} onFechar={fechar} onConcluido={concluido} />}
    {dialogo?.tipo === "status" && <ConfirmarStatusUsuario usuario={dialogo.usuario} onFechar={fechar} onConcluido={concluido} />}
  </div>;
}
