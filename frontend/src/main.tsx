import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { MOCK_ATIVO } from "./shared/lib/modoApi";
import type { AplicacaoProps } from "./shared/types/demonstracao";

// Mock condicional:
//   • Em produção: respeita VITE_USE_MOCK definido em build-time.
//   • Em dev: a escolha persiste em localStorage e pode ser trocada pelo
//     ApiModeSwitcher (popup no canto inferior direito) sem reiniciar o servidor.
const useMock = MOCK_ATIVO;
let ambiente: AplicacaoProps["ambiente"];

if (useMock) {
  await import("./shared/api/mock");
  ambiente = (await import("./composition/AmbienteDemonstracao")).AmbienteDemonstracao;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App ambiente={ambiente} />
  </StrictMode>
);
