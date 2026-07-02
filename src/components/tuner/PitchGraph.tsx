import { useEffect, useRef, type RefObject } from "react";
import { midiToNote, type Notation } from "../../lib/notes";
import { followCenter, midiToY, visibleRange } from "../../lib/pitch-graph";

const HEIGHT = 360; // alto lógico (px CSS); el ancho es responsive
const GUTTER = 44; // columna de etiquetas de nota a la izquierda
const SPAN = 24; // semitonos visibles (2 octavas)
const SMOOTH = 0.12; // suavizado del auto-scroll vertical
const CENTER_BOUNDS = { low: 48, high: 72 }; // el centro se mueve entre C3 y C5
const INITIAL_CENTER = 60; // C4

// El canvas usa strings de color (no clases Tailwind). Estos valores REFLEJAN los
// tokens de index.css (@theme). Si algún día hay theming, leerlos con getComputedStyle.
const COLORS = {
  bg: "#0b1120", // --color-base
  rowNatural: "#131c30", // --color-surface (fila de tecla blanca)
  rowSharp: "#0d1526", // entre base y surface (fila de tecla negra)
  octaveLine: "#3a496b", // borde algo más vivo, para orientarse en cada C
  label: "#e8ecf5", // --color-fg
  labelDim: "#5b6a86", // --color-fg-subtle
  block: "rgba(251, 191, 36, 0.55)", // --color-pitch (historial)
  blockTip: "rgba(251, 191, 36, 0.95)", // --color-pitch (nota actual, más viva)
  trace: "#ffffff",
  traceGlow: "rgba(255, 255, 255, 0.55)",
};

interface PitchGraphProps {
  /** Historial de pitch continuo (MIDI o null), viejo→nuevo. Ref mutable: no re-renderiza. */
  bufferRef: RefObject<(number | null)[]>;
  capacity: number;
  notation: Notation;
}

/**
 * Gráfico de afinación en el tiempo (piano roll con auto-scroll vertical).
 * Imperativo: dibuja en su propio loop de rAF leyendo el buffer, desacoplado de React.
 * Renderiza a devicePixelRatio para que se vea nítido (no escalado/borroso).
 */
export function PitchGraph({ bufferRef, capacity, notation }: PitchGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const centerRef = useRef(INITIAL_CENTER);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return; // jsdom no implementa canvas 2d → no rompe

    // Backing store a la densidad real de la pantalla → nitidez.
    let W = 0;
    const H = HEIGHT;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      W = canvas.clientWidth;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    ro?.observe(canvas);

    let raf = 0;
    const draw = () => {
      if (W === 0) {
        raf = requestAnimationFrame(draw); // aún sin medir
        return;
      }
      const plotW = W - GUTTER;
      const rowH = H / SPAN;
      const stepX = plotW / (capacity - 1);
      const buf = bufferRef.current ?? [];

      // auto-scroll: el centro sigue la muestra más nueva (o se queda quieto)
      let target = centerRef.current;
      let tipIndex = -1;
      for (let i = buf.length - 1; i >= 0; i--) {
        if (buf[i] != null) {
          target = buf[i] as number;
          tipIndex = i;
          break;
        }
      }
      centerRef.current = followCenter(centerRef.current, target, SMOOTH, CENTER_BOUNDS);
      const range = visibleRange(centerRef.current, SPAN);

      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, W, H);

      // filas estilo teclado (blancas/negras) + etiqueta de TODAS las notas
      ctx.textBaseline = "middle";
      for (let m = Math.ceil(range.low) - 1; m <= Math.floor(range.high) + 1; m++) {
        const y = midiToY(m, range) * H;
        const note = midiToNote(m, notation);
        const sharp = note.name.includes("#");
        const pitchClass = ((m % 12) + 12) % 12;

        ctx.fillStyle = sharp ? COLORS.rowSharp : COLORS.rowNatural;
        ctx.fillRect(GUTTER, y - rowH / 2, plotW, rowH);

        if (pitchClass === 0) {
          ctx.strokeStyle = COLORS.octaveLine;
          ctx.beginPath();
          ctx.moveTo(GUTTER, y + rowH / 2);
          ctx.lineTo(W, y + rowH / 2);
          ctx.stroke();
        }

        ctx.fillStyle = sharp ? COLORS.labelDim : COLORS.label;
        ctx.font = sharp ? "9px sans-serif" : "11px sans-serif";
        ctx.fillText(note.label, 6, y);
      }

      // bloques de nota (naranja): uno por muestra; el más nuevo, más vivo.
      for (let i = 0; i < buf.length; i++) {
        const midi = buf[i];
        if (midi == null) continue;
        const note = Math.round(midi);
        if (note < range.low || note > range.high) continue;
        const y = midiToY(note, range) * H;
        ctx.fillStyle = i === tipIndex ? COLORS.blockTip : COLORS.block;
        ctx.fillRect(GUTTER + i * stepX, y - rowH / 2, stepX + 1, rowH);
      }

      // traza continua (blanca) con glow, encima
      ctx.save();
      ctx.shadowColor = COLORS.traceGlow;
      ctx.shadowBlur = 6;
      ctx.strokeStyle = COLORS.trace;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.beginPath();
      let drawing = false;
      for (let i = 0; i < buf.length; i++) {
        const midi = buf[i];
        if (midi == null || midi < range.low || midi > range.high) {
          drawing = false; // hueco: silencio o fuera de la ventana
          continue;
        }
        const x = GUTTER + i * stepX;
        const y = midiToY(midi, range) * H;
        if (!drawing) {
          ctx.moveTo(x, y);
          drawing = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.restore();

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [bufferRef, capacity, notation]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="w-full max-w-2xl rounded-md"
      style={{ height: HEIGHT }}
    />
  );
}
