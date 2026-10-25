import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { getApiMode } from "./shared/components/dev/ApiModeSwitcher.tsx";

// Mock condicional:
//   • Em produção: respeita VITE_USE_MOCK definido em build-time.
//   • Em dev: a escolha persiste em localStorage e pode ser trocada pelo
//     ApiModeSwitcher (popup no canto inferior direito) sem reiniciar o servidor.
const useMock =
  import.meta.env.DEV
    ? getApiMode() === "mock"
    : import.meta.env.VITE_USE_MOCK === "true";

if (useMock) {
  await import("./shared/api/mock");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
