import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Kanban from "./pages/Kanban";
import CadastrarObra from "./pages/CadastrarObra";
import AndamentoHomologacao from "./pages/AndamentoHomologacao";
import LinkInstaladores from "./pages/LinkInstaladores";
import Equipes from "./pages/Equipes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ReloadPrompt } from "./components/pwa/ReloadPrompt";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";

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
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster richColors position="top-right" />
      <ReloadPrompt />
      <BrowserRouter>

      <Routes>
        {/* Rotas Públicas (sem Sidebar, sem DashboardLayout) */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        {/* Rota Mobile Standalone (layout próprio, sem Sidebar) */}
        <Route element={<ProtectedRoute allowedRoles={["Administrador", "InstaladorCampo"]} />}>
          <Route path="/linkparainstaladores" element={<LinkInstaladores />} />
        </Route>

        {/* Rotas Privadas (Protegidas por JWT com DashboardLayout) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            {/* Kanban: Visível para Admin, Engenharia, Financeiro e Leitores */}
            <Route element={<ProtectedRoute allowedRoles={["Administrador", "EngenhariaObras", "Financeiro", "VisualizadorLeitor"]} />}>
              <Route path="/kanban" element={<Kanban />} />
            </Route>

            {/* Equipes (Gantt): Visível para Admin, Engenharia, Financeiro e Leitores */}
            <Route element={<ProtectedRoute allowedRoles={["Administrador", "EngenhariaObras", "Financeiro", "VisualizadorLeitor"]} />}>
              <Route path="/equipes" element={<Equipes />} />
            </Route>

            {/* Gestão de Obras: Apenas Admin e Engenharia */}
            <Route element={<ProtectedRoute allowedRoles={["Administrador", "EngenhariaObras"]} />}>
              <Route path="/cadastrarobra" element={<CadastrarObra />} />
              <Route path="/acompanharhomologacao" element={<AndamentoHomologacao />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
  );
}

export default App;

