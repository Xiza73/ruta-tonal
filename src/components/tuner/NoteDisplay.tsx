import type { DetectedNote } from "../../lib/notes";
import { cn } from "../../lib/cn";

interface NoteDisplayProps {
  note: DetectedNote | null;
  listening: boolean;
}

/** Tolerancia para considerar la nota "afinada" (±cents). */
const IN_TUNE_CENTS = 5;

/** Presentacional puro: muestra la nota detectada y su desviación en cents. */
export function NoteDisplay({ note, listening }: NoteDisplayProps) {
  const inTune = note !== null && Math.abs(note.cents) <= IN_TUNE_CENTS;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        aria-label="Nota detectada"
        className={cn(
          "text-6xl font-bold tabular-nums",
          note ? (inTune ? "text-green-400" : "text-slate-100") : "text-slate-600",
        )}
      >
        {note ? note.label : listening ? "—" : "·"}
      </div>

      {/* Aguja de afinación: -50 (bemol) · 0 (justo) · +50 (sostenido). */}
      <div className="relative h-2 w-64 rounded-full bg-slate-700">
        <div className="absolute top-0 left-1/2 h-full w-px bg-slate-400" />
        {note && (
          <div
            className={cn(
              "absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full",
              inTune ? "bg-green-400" : "bg-amber-400",
            )}
            style={{ left: `${50 + note.cents}%` }}
          />
        )}
      </div>

      <p className="text-xs text-slate-400">
        {note
          ? `${note.cents > 0 ? "+" : ""}${note.cents} cents`
          : listening
            ? "Escuchando…"
            : "Micrófono apagado"}
      </p>
    </div>
  );
}
