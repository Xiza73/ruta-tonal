import type { CSSProperties } from "react";
import { keyLabel, type KeyboardKey } from "../../lib/keyboard";
import { cn } from "../../lib/cn";

interface PianoKeyProps {
  k: KeyboardKey;
  active: boolean;
  onPress: (midi: number) => void;
  onRelease: (midi: number) => void;
  configMode?: boolean;
  selected?: boolean;
  style?: CSSProperties;
}

/** Una tecla. Estilo neón: blancas off-white, negras navy, presionada = cyan glow. */
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
        "flex flex-col items-center justify-end gap-1 pb-2 text-[10px] font-medium select-none transition-[background,box-shadow] duration-75",
        k.isSharp
          ? "absolute top-0 z-10 h-[62%] -translate-x-1/2 rounded-b border border-white/10 bg-[#10141e] text-fg-muted shadow-[2px_5px_10px_rgba(0,0,0,0.6)]"
          : "mx-[2px] h-full flex-1 rounded-b border border-black/10 bg-white text-ink-950 shadow-[0_4px_8px_rgba(0,0,0,0.45)]",
        active && !k.isSharp && "bg-key-active text-key-active-fg",
        active && k.isSharp && "bg-key-active-sharp text-ink-50",
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
