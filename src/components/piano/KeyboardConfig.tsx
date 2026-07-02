import type { ReactNode } from "react";
import { useKeyboardStore } from "../../stores/keyboard";
import { cn } from "../../lib/cn";

const OCTAVES = [1, 2, 3];
const SOUNDS: { value: OscillatorType; label: string }[] = [
  { value: "triangle", label: "Triangular" },
  { value: "sine", label: "Senoidal" },
  { value: "square", label: "Cuadrada" },
  { value: "sawtooth", label: "Sierra" },
];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-col items-center gap-1">
      <span className="text-xs font-medium text-fg-muted uppercase">{label}</span>
      <div className="flex gap-1">{children}</div>
    </div>
  );
}

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1 text-sm font-medium transition-colors",
        "focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
        active
          ? "bg-accent text-accent-fg"
          : "bg-elevated text-fg-muted hover:bg-border hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

/** Controles del teclado: notación, tamaño y tipo de sonido. Barra compacta. */
export function KeyboardConfig() {
  const notation = useKeyboardStore((s) => s.notation);
  const octaves = useKeyboardStore((s) => s.octaves);
  const soundType = useKeyboardStore((s) => s.soundType);
  const setNotation = useKeyboardStore((s) => s.setNotation);
  const setOctaves = useKeyboardStore((s) => s.setOctaves);
  const setSoundType = useKeyboardStore((s) => s.setSoundType);

  return (
    <div className="flex flex-wrap items-start justify-center gap-x-8 gap-y-3">
      <Field label="Notación">
        <Toggle active={notation === "solfege"} onClick={() => setNotation("solfege")}>
          Latín
        </Toggle>
        <Toggle active={notation === "scientific"} onClick={() => setNotation("scientific")}>
          Anglosajón
        </Toggle>
      </Field>

      <Field label="Octavas">
        {OCTAVES.map((o) => (
          <Toggle key={o} active={octaves === o} onClick={() => setOctaves(o)}>
            {o}
          </Toggle>
        ))}
      </Field>

      <Field label="Sonido">
        <select
          value={soundType}
          onChange={(e) => setSoundType(e.target.value as OscillatorType)}
          aria-label="Tipo de sonido"
          className={cn(
            "rounded-md bg-elevated px-3 py-1 text-sm font-medium text-fg",
            "focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
          )}
        >
          {SOUNDS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}
