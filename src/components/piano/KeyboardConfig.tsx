import { AudioWaveform } from "lucide-react";
import { useKeyboardStore } from "../../stores/keyboard";
import { midiToNote } from "../../lib/notes";
import type { SoundType } from "../../lib/keyboard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OCTAVE_OPTIONS = [1, 2, 3, 4];
const START_OPTIONS = [36, 48, 60]; // C2, C3, C4
const SOUNDS: { value: SoundType; label: string }[] = [
  { value: "piano", label: "Piano (real)" },
  { value: "triangle", label: "Triangular" },
  { value: "sine", label: "Senoidal" },
  { value: "square", label: "Cuadrada" },
  { value: "sawtooth", label: "Sierra" },
];

/**
 * Controles del teclado sin labels: cada control se explica solo
 * (notación por valor, "2 oct", "desde C3", ícono de onda en el sonido).
 */
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
    <div className="flex flex-wrap items-center justify-center gap-3">
      {/* Notación (los valores se explican solos) */}
      <div className="flex gap-1">
        <Button
          variant={notation === "solfege" ? "default" : "secondary"}
          aria-pressed={notation === "solfege"}
          onClick={() => setNotation("solfege")}
        >
          Latín
        </Button>
        <Button
          variant={notation === "scientific" ? "default" : "secondary"}
          aria-pressed={notation === "scientific"}
          onClick={() => setNotation("scientific")}
        >
          Anglosajón
        </Button>
      </div>

      <Select value={String(octaves)} onValueChange={(v) => setOctaves(Number(v))}>
        <SelectTrigger aria-label="Cantidad de octavas">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OCTAVE_OPTIONS.map((o) => (
            <SelectItem key={o} value={String(o)}>
              {o} oct
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={String(startMidi)} onValueChange={(v) => setStartMidi(Number(v))}>
        <SelectTrigger aria-label="Octava inicial">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {START_OPTIONS.map((m) => (
            <SelectItem key={m} value={String(m)}>
              desde {midiToNote(m, notation).label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={soundType} onValueChange={(v) => setSoundType(v as SoundType)}>
        <SelectTrigger aria-label="Tipo de sonido">
          <AudioWaveform className="opacity-70" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SOUNDS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
