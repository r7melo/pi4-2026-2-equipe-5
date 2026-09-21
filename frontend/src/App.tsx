import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Kanban from "./pages/Kanban";
import CadastroObra from "./pages/CadastrarObra";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/kanban" element={<Kanban />} />
        <Route path="/cadastrarobra" element={<CadastroObra />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
