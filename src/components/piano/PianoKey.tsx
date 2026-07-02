import type { CSSProperties } from "react";
import { keyLabel, type KeyboardKey } from "../../lib/keyboard";
import { cn } from "../../lib/cn";

interface PianoKeyProps {
  k: KeyboardKey;
  active: boolean;
  onPress: (midi: number) => void;
  onRelease: (midi: number) => void;
  /** Modo configuración: muestra la tecla física asignada. */
  configMode?: boolean;
  /** Nota seleccionada esperando asignación. */
  selected?: boolean;
  /** Posición/ancho de las teclas negras (dinámico → va por style). */
  style?: CSSProperties;
}

/** Una tecla. Presentacional puro: sin audio, solo eventos hacia el container. */
export function PianoKey({
  k,
  active,
  onPress,
  onRelease,
  configMode = false,
  selected = false,
  style,
}: PianoKeyProps) {
  return (
    <button
      type="button"
      style={style}
      aria-label={k.label}
      aria-pressed={active}
      onPointerDown={() => onPress(k.midi)}
      onPointerUp={() => onRelease(k.midi)}
      onPointerLeave={(e) => {
        if (!configMode && e.buttons) onRelease(k.midi);
      }}
      className={cn(
        "flex flex-col items-center justify-end gap-1 pb-2 text-[10px] font-medium select-none",
        k.isSharp
          ? "absolute top-0 z-10 h-[62%] -translate-x-1/2 rounded-b border border-base bg-base text-fg-muted"
          : "h-full flex-1 rounded-b border border-border bg-white text-fg-subtle",
        active && "bg-accent text-accent-fg",
        selected && "z-20 ring-2 ring-accent ring-inset",
      )}
    >
      {configMode && (
        <span
          className={cn(
            "rounded px-1 text-[9px] leading-tight",
            k.isSharp ? "bg-white/15" : "bg-black/10",
            !k.code && "opacity-40",
          )}
        >
          {k.code ? keyLabel(k.code) : "·"}
        </span>
      )}
      {k.label}
    </button>
  );
}
