import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Aplica el tema persistido ANTES del render: evita el flash y hace que el
// canvas del tuner lea la paleta correcta en el primer frame.
try {
  const persisted = localStorage.getItem("ruta-tonal-theme");
  if (persisted && JSON.parse(persisted)?.state?.theme === "light") {
    document.documentElement.classList.add("light");
  }
} catch {
  // localStorage/JSON no disponible: se queda en el tema por defecto (oscuro).
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
