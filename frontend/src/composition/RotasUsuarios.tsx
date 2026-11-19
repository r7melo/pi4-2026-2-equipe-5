import UsuariosPage from "@/features/usuarios/pages/Usuarios";
import CadastrarUsuario from "@/features/usuarios/pages/CadastrarUsuario";
import { useSessaoUsuarios } from "@/features/usuarios/hooks/useSessaoUsuarios";
import { useAuthStore } from "@/shared/stores/useAuthStore";
export function Usuarios() {
  const geracao = useSessaoUsuarios(); const id = useAuthStore(s => s.usuario?.id);
  return id ? <UsuariosPage key={geracao} usuarioId={id} /> : null;
}
export function CadastroUsuario() {
  const geracao = useSessaoUsuarios(); return <CadastrarUsuario key={geracao} />;
}
