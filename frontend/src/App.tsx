import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Kanban from "./pages/Kanban";
import CadastroObra from "./pages/CadastrarObra";
import AndamentoHomologacao from "./pages/AndamentoHomologacao";
import LinkInstaladores from "./pages/LinkInstaladores";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/kanban" element={<Kanban />} />
        <Route path="/cadastrarobra" element={<CadastroObra />} />
        <Route path="/acompanharhomologacao" element={<AndamentoHomologacao />} />
        <Route path="/linkparainstaladores" element={<LinkInstaladores />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
