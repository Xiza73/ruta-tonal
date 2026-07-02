import { useKeyboardStore } from "../../stores/keyboard";
import { cn } from "../../lib/cn";

/** Entra/sale del modo configuración de teclas. */
export function ConfigModeButton() {
  const configMode = useKeyboardStore((s) => s.configMode);
  const setConfigMode = useKeyboardStore((s) => s.setConfigMode);

  return (
    <button
      type="button"
      aria-label={configMode ? "Salir de configuración de teclas" : "Configurar teclas"}
      aria-pressed={configMode}
      onClick={() => setConfigMode(!configMode)}
      className={cn(
        "flex size-10 items-center justify-center rounded-lg transition-colors",
        "focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
        configMode
          ? "bg-accent text-accent-fg"
          : "bg-elevated text-fg-muted hover:bg-border hover:text-fg",
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5"
        aria-hidden="true"
      >
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="17" y1="16" x2="23" y2="16" />
      </svg>
    </button>
  );
}
