import type { CSSProperties } from "react";
import type { KeyboardKey } from "../../lib/keyboard";
import { cn } from "../../lib/cn";

interface PianoKeyProps {
  k: KeyboardKey;
  active: boolean;
  onPress: (midi: number) => void;
  onRelease: (midi: number) => void;
  /** Posición/ancho de las teclas negras (dinámico → va por style). */
  style?: CSSProperties;
}

/** Una tecla. Presentacional puro: sin audio, solo eventos hacia el container. */
export function PianoKey({ k, active, onPress, onRelease, style }: PianoKeyProps) {
  return (
    <button
      type="button"
      style={style}
      aria-label={k.label}
      aria-pressed={active}
      onPointerDown={() => onPress(k.midi)}
      onPointerUp={() => onRelease(k.midi)}
      onPointerLeave={(e) => {
        if (e.buttons) onRelease(k.midi);
      }}
      className={cn(
        "flex items-end justify-center pb-2 text-[10px] font-medium select-none",
        k.isSharp
          ? "absolute top-0 z-10 h-[62%] -translate-x-1/2 rounded-b border border-base bg-base text-fg-muted"
          : "h-full flex-1 rounded-b border border-border bg-white text-fg-subtle",
        active && "bg-accent text-accent-fg",
      )}
    >
      {k.label}
    </button>
  );
}
