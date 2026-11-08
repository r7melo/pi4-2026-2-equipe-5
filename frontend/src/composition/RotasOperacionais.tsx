import KanbanPage from "@/features/kanban/pages/Kanban";
import EquipesPage from "@/features/cronograma/pages/Equipes";
import { AcoesInstalacao } from "./AcoesInstalacao";
import type { RenderizarAcoesObra } from "@/types";

const renderizarAcoesInstalacao: RenderizarAcoesObra = (obraId) => (
  <AcoesInstalacao obraId={obraId} />
);

export function Kanban() {
  return <KanbanPage renderizarAcoesObra={renderizarAcoesInstalacao} />;
}

export function Equipes() {
  return <EquipesPage renderizarAcoesObra={renderizarAcoesInstalacao} />;
}
