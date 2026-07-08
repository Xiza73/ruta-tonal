import type { ReactNode } from "react";
import { useKeyboardStore } from "../../stores/keyboard";
import { midiToNote } from "../../lib/notes";
import type { SoundType } from "../../lib/keyboard";
import { cn } from "../../lib/cn";

const OCTAVE_OPTIONS = [1, 2, 3, 4];
const START_OPTIONS = [36, 48, 60]; // C2, C3, C4
const SOUNDS: { value: SoundType; label: string }[] = [
  { value: "piano", label: "Piano (real)" },
  { value: "triangle", label: "Triangular" },
  { value: "sine", label: "Senoidal" },
  { value: "square", label: "Cuadrada" },
  { value: "sawtooth", label: "Sierra" },
];

const selectClass = cn(
  "rounded-md bg-elevated px-3 py-1 text-sm font-medium text-fg",
  "focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
);

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

/** Controles del teclado: notación, tamaño, octava inicial y tipo de sonido. */
export function KeyboardConfig() {
  const notation = useKeyboardStore((s) => s.notation);
  const octaves = useKeyboardStore((s) => s.octaves);
  const startMidi = useKeyboardStore((s) => s.startMidi);
  const soundType = useKeyboardStore((s) => s.soundType);
  const setNotation = useKeyboardStore((s) => s.setNotation);
  const setOctaves = useKeyboardStore((s) => s.setOctaves);
  const setStartMidi = useKeyboardStore((s) => s.setStartMidi);
  const setSoundType = useKeyboardStore((s) => s.setSoundType);

  return (
    <div className="flex flex-wrap items-start justify-center gap-x-6 gap-y-3">
      <Field label="Notación">
        <Toggle active={notation === "solfege"} onClick={() => setNotation("solfege")}>
          Latín
        </Toggle>
        <Toggle active={notation === "scientific"} onClick={() => setNotation("scientific")}>
          Anglosajón
        </Toggle>
      </Field>

      <Field label="Octavas">
        <select
          value={octaves}
          onChange={(e) => setOctaves(Number(e.target.value))}
          aria-label="Cantidad de octavas"
          className={selectClass}
        >
          {OCTAVE_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Inicio">
        <select
          value={startMidi}
          onChange={(e) => setStartMidi(Number(e.target.value))}
          aria-label="Octava inicial"
          className={selectClass}
        >
          {START_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {midiToNote(m, notation).label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Sonido">
        <select
          value={soundType}
          onChange={(e) => setSoundType(e.target.value as SoundType)}
          aria-label="Tipo de sonido"
          className={selectClass}
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
