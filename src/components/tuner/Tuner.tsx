import { useEffect, useRef, useState } from "react";
import { createPitchDetector, type MicPitchDetector } from "../../audio/pitch";
import { midiToNote, type DetectedNote } from "../../lib/notes";
import { continuousMidi, median } from "../../lib/pitch-graph";
import { cn } from "../../lib/cn";
import { PitchGraph } from "./PitchGraph";

const CAPACITY = 300; // muestras en pantalla (~unos segundos)
const SMOOTH_WINDOW = 7; // frames para la mediana (rechaza saltos de octava de hasta 3 frames)

/**
 * Container del tuner: dueño del micrófono y del historial de pitch.
 * Suaviza el pitch con una mediana móvil (mata outliers de octava) y guarda el
 * resultado en un ref; el estado de React solo cambia al cambiar la nota mostrada.
 */
export function Tuner() {
  const detectorRef = useRef<MicPitchDetector | null>(null);
  const bufferRef = useRef<(number | null)[]>([]);
  const recentRef = useRef<number[]>([]); // ventana para la mediana
  const lastLabelRef = useRef<string | null>(null);
  const [listening, setListening] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => detectorRef.current?.stop(), []);

  function handleReading(note: DetectedNote | null) {
    const raw = continuousMidi(note);
    const recent = recentRef.current;

    let smoothed: number | null;
    if (raw == null) {
      recent.length = 0; // silencio → reiniciar la ventana
      smoothed = null;
    } else {
      recent.push(raw);
      if (recent.length > SMOOTH_WINDOW) recent.shift();
      smoothed = median(recent);
    }

    const buf = bufferRef.current;
    buf.push(smoothed);
    if (buf.length > CAPACITY) buf.shift();

    // re-render solo al cambiar la nota mostrada (no en cada frame)
    const next = smoothed === null ? null : midiToNote(Math.round(smoothed), "scientific").label;
    if (next !== lastLabelRef.current) {
      lastLabelRef.current = next;
      setLabel(next);
    }
  }

  async function start() {
    setError(null);
    detectorRef.current ??= createPitchDetector({ onReading: handleReading });
    try {
      await detectorRef.current.start();
      setListening(true);
    } catch {
      setError("No se pudo acceder al micrófono. Revisá los permisos.");
    }
  }

  function stop() {
    detectorRef.current?.stop();
    bufferRef.current = [];
    recentRef.current = [];
    lastLabelRef.current = null;
    setLabel(null);
    setListening(false);
  }

  return (
    <section className="flex w-full flex-col items-center gap-4">
      <PitchGraph bufferRef={bufferRef} capacity={CAPACITY} notation="scientific" />
      <p aria-live="polite" className="text-sm text-fg">
        {listening ? (label ? `Nota: ${label}` : "Escuchando…") : "Micrófono apagado"}
      </p>
      <button
        type="button"
        onClick={listening ? stop : start}
        className={cn(
          "rounded-md px-4 py-2 text-sm font-medium text-accent-fg",
          listening ? "bg-danger hover:bg-danger-hover" : "bg-accent hover:bg-accent-hover",
        )}
      >
        {listening ? "Detener" : "Activar micrófono"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </section>
  );
}
