import { useTunerStore } from "../../stores/tuner";
import { cn } from "../../lib/cn";

/** Ícono de micrófono (toggle). Controla el detector vía el store del tuner. */
export function MicButton() {
  const listening = useTunerStore((s) => s.listening);
  const start = useTunerStore((s) => s.start);
  const stop = useTunerStore((s) => s.stop);

  return (
    <button
      type="button"
      aria-label={listening ? "Detener micrófono" : "Activar micrófono"}
      aria-pressed={listening}
      onClick={listening ? stop : start}
      className={cn(
        "flex size-10 items-center justify-center rounded-lg transition-colors",
        "focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
        listening
          ? "bg-danger text-accent-fg hover:bg-danger-hover"
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
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    </button>
  );
}
