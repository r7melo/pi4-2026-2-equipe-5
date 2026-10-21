import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "@/features/auth/pages/Login";
import Kanban from "@/features/kanban/pages/Kanban";
import CadastrarObra from "@/features/obras/pages/CadastrarObra";
import AndamentoHomologacao from "@/features/homologacao/pages/AndamentoHomologacao";
import LinkInstaladores from "@/features/materiais/pages/LinkInstaladores";
import Equipes from "@/features/cronograma/pages/Equipes";
import DetalheObra from "@/features/obras/pages/DetalheObra";
import MateriaisObra from "@/features/materiais/pages/MateriaisObra";
import Relatorios from "@/features/financeiro/pages/Relatorios";
import Financeiro from "@/features/financeiro/pages/Financeiro";
import RelatorioPublico from "@/features/financeiro/pages/RelatorioPublico";
import CronogramaPublico from "@/features/cronograma/pages/CronogramaPublico";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ReloadPrompt } from "@/shared/components/pwa/ReloadPrompt";
import ProtectedRoute from "@/features/auth/components/ProtectedRoute";
import DashboardLayout from "@/shared/layouts/DashboardLayout";
import { useThemeStore, aplicarTemaNoDOM } from "@/shared/stores/useThemeStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      networkMode: "offlineFirst",
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
});

function App() {
  const tema = useThemeStore((s) => s.tema);

  useEffect(() => {
    aplicarTemaNoDOM(tema);
    if (tema !== "system" || typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => aplicarTemaNoDOM("system");
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [tema]);

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster richColors position="top-right" theme={tema} />
      <ReloadPrompt />
      <BrowserRouter>
        <Routes>
          {/* Rotas Públicas (sem Sidebar, sem DashboardLayout) */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cronograma/compartilhado/:token" element={<CronogramaPublico />} />
          <Route path="/relatorio-publico/:token" element={<RelatorioPublico />} />

          {/* Rota Mobile Standalone (layout próprio, sem Sidebar) */}
          <Route element={<ProtectedRoute allowedRoles={["Administrador", "InstaladorCampo"]} />}>
            <Route path="/linkparainstaladores" element={<LinkInstaladores />} />
          </Route>

          {/* Rotas Privadas (Protegidas por JWT com DashboardLayout) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              {/* Kanban: Visível para Admin, Engenharia e Financeiro */}
              <Route element={<ProtectedRoute allowedRoles={["Administrador", "Engenharia", "Financeiro"]} />}>
                <Route path="/kanban" element={<Kanban />} />
              </Route>

              {/* Equipes (Gantt): Visível para Admin, Engenharia e Financeiro */}
              <Route element={<ProtectedRoute allowedRoles={["Administrador", "Engenharia", "Financeiro"]} />}>
                <Route path="/equipes" element={<Equipes />} />
              </Route>

              {/* Gestão de Obras: Apenas Admin e Engenharia */}
              <Route element={<ProtectedRoute allowedRoles={["Administrador", "Engenharia"]} />}>
                <Route path="/cadastrarobra" element={<CadastrarObra />} />
                <Route path="/acompanharhomologacao" element={<AndamentoHomologacao />} />
              </Route>

              {/* Detalhe da Obra: Admin, Engenharia e Financeiro (RF-03/11) */}
              <Route element={<ProtectedRoute allowedRoles={["Administrador", "Engenharia", "Financeiro"]} />}>
                <Route path="/obras/:id" element={<DetalheObra />} />
              </Route>

              {/* Materiais da Obra: Admin e Engenharia (RF-06) */}
              <Route element={<ProtectedRoute allowedRoles={["Administrador", "Engenharia"]} />}>
                <Route path="/obras/:id/materiais" element={<MateriaisObra />} />
              </Route>

              {/* Relatórios e Financeiro: Admin e Financeiro (RF-14/15) */}
              <Route element={<ProtectedRoute allowedRoles={["Administrador", "Financeiro"]} />}>
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="/financeiro" element={<Financeiro />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
