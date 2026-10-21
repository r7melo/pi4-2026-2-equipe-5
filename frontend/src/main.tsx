import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Mock condicional via VITE_USE_MOCK
if (import.meta.env.VITE_USE_MOCK === "true") {
  await import("./shared/api/mock");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
