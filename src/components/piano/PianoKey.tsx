import type { CSSProperties } from "react";
import type { KeyboardKey } from "../../lib/keyboard";
import { cn } from "../../lib/cn";

interface PianoKeyProps {
  k: KeyboardKey;
  active: boolean;
  onPress: (midi: number) => void;
  onRelease: (midi: number) => void;
  /** Posición de las teclas negras (dinámica → va por style). */
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
        if (e.buttons) onRelease(k.midi); // arrastraste el mouse fuera con el botón apretado
      }}
      className={cn(
        "flex items-end justify-center pb-2 text-xs font-medium select-none",
        k.isSharp
          ? "absolute top-0 z-10 h-24 w-6 -translate-x-1/2 rounded-b border border-slate-900 bg-slate-900 text-slate-300"
          : "h-40 w-10 rounded-b border border-slate-300 bg-white text-slate-500",
        active && (k.isSharp ? "bg-blue-600 text-white" : "bg-blue-200 text-blue-900"),
      )}
    >
      {k.label}
    </button>
  );
}
