// Definição centralizada das rotas do Dashboard
// Usada pelo Sidebar.tsx e potencialmente por breadcrumbs futuros
import {
  LayoutDashboard,
  Users,
  FileCheck,
  DollarSign,
  BarChart2,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface RotaDashboard {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Paths adicionais que ativam o highlight deste item (ex: /cadastrarobra ativa "Obras") */
  activeAlsoPaths?: string[];
}

export const ROTAS_DASHBOARD: RotaDashboard[] = [
  {
    label: "Obras",
    path: "/kanban",
    icon: LayoutDashboard,
    activeAlsoPaths: ["/cadastrarobra"],
  },
  { label: "Equipes", path: "/equipes", icon: Users },
  {
    label: "Homologação",
    path: "/acompanharhomologacao",
    icon: FileCheck,
  },
  { label: "Financeiro", path: "/financeiro", icon: DollarSign },
  { label: "Relatórios", path: "/relatorios", icon: BarChart2 },
  { label: "Configurações", path: "/configuracoes", icon: Settings },
];
