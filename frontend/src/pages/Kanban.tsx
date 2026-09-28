import { useNavigate } from "react-router-dom";
import { Plus, Filter } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import KanbanBoard from "@/components/kanban/KanbanBoard";
import { Button } from "@/components/ui/Button";
import { RoleGate } from "@/components/auth/RoleGate";

export default function Kanban() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <PageHeader title="Funil de Obras" subtitle="Acompanhamento por etapa">
        <Button
          variant="outline"
          size="md"
          title="Filtros / Busca"
          className="px-3 md:px-4"
        >
          <Filter className="w-4 h-4" />
          <span className="hidden md:inline">Filtros / Busca</span>
        </Button>
        <RoleGate allowedRoles={["Administrador", "EngenhariaObras"]}>
          <Button
            onClick={() => void navigate("/cadastrarobra")}
            variant="primary"
            size="md"
            title="Nova obra"
            className="px-3 md:px-4"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline">Nova obra</span>
          </Button>
        </RoleGate>
      </PageHeader>


      <main className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar bg-background-app flex flex-col">
        <KanbanBoard />
      </main>
    </div>
  );
}

