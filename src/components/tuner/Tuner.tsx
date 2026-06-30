import { useEffect, useRef, useState } from "react";
import { createPitchDetector, type MicPitchDetector } from "../../audio/pitch";
import type { DetectedNote } from "../../lib/notes";
import { cn } from "../../lib/cn";
import { NoteDisplay } from "./NoteDisplay";

/**
 * Container del tuner: dueño del micrófono y del estado de la nota detectada.
 * El detector se crea al activar (gesto del usuario → permiso de micrófono).
 */
export function Tuner() {
  const detectorRef = useRef<MicPitchDetector | null>(null);
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState<DetectedNote | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => detectorRef.current?.stop(), []);

  async function start() {
    setError(null);
    detectorRef.current ??= createPitchDetector({ onReading: setNote });
    try {
      await detectorRef.current.start();
      setListening(true);
    } catch {
      setError("No se pudo acceder al micrófono. Revisá los permisos.");
    }
  }

  function stop() {
    detectorRef.current?.stop();
    setListening(false);
    setNote(null);
  }

  return (
    <section className="flex flex-col items-center gap-4">
      <NoteDisplay note={note} listening={listening} />
      <button
        type="button"
        onClick={listening ? stop : start}
        className={cn(
          "rounded-md px-4 py-2 text-sm font-medium text-white",
          listening ? "bg-red-600 hover:bg-red-500" : "bg-blue-600 hover:bg-blue-500",
        )}
      >
        {listening ? "Detener" : "Activar micrófono"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </section>
  );
}
