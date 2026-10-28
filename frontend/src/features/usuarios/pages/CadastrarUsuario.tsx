import { PageHeader } from "@/shared/components/ui/PageHeader";
import FormularioCadastrarUsuario from "../components/FormularioCadastrarUsuario";
export default function CadastrarUsuario() {
  return <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
    <PageHeader title="Cadastrar usuário" />
    <div className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6 bg-background-app"><FormularioCadastrarUsuario /></div>
  </div>;
}
