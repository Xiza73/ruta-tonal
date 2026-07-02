import { useEffect, useRef } from "react";
import { midiToNote, type Notation } from "../../lib/notes";
import { followCenter, midiToY, visibleRange } from "../../lib/pitch-graph";

const GUTTER = 44; // columna de etiquetas de nota a la izquierda
const SPAN = 24; // semitonos visibles (2 octavas)
const SMOOTH = 0.12; // suavizado del auto-scroll vertical
const CENTER_BOUNDS = { low: 48, high: 72 }; // el centro se mueve entre C3 y C5
const INITIAL_CENTER = 60; // C4

// El canvas usa strings de color; estos valores REFLEJAN los tokens de index.css.
const COLORS = {
  bg: "#0b0f1c",
  rowNatural: "#12172a",
  rowSharp: "#0e1322",
  octaveLine: "#37425f",
  label: "#f4f6fb",
  labelDim: "#7a869f",
  block: "rgba(245, 181, 43, 0.55)",
  blockTip: "rgba(245, 181, 43, 0.95)",
  trace: "#ffffff",
  traceGlow: "rgba(255, 255, 255, 0.55)",
};

interface PitchGraphProps {
  /** Historial de pitch continuo (MIDI o null), viejo→nuevo. Mutado in-place. */
  buffer: (number | null)[];
  capacity: number;
  notation: Notation;
}

/**
 * Gráfico de afinación en el tiempo (piano roll con auto-scroll vertical).
 * Ancho y alto responsive (llena su contenedor), a devicePixelRatio.
 */
export function PitchGraph({ buffer, capacity, notation }: PitchGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const centerRef = useRef(INITIAL_CENTER);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return; // jsdom no implementa canvas 2d → no rompe

    let W = 0;
    let H = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    ro?.observe(canvas);

    let raf = 0;
    const draw = () => {
      if (W === 0 || H === 0) {
        raf = requestAnimationFrame(draw);
        return;
      }
      const plotW = W - GUTTER;
      const rowH = H / SPAN;
      const stepX = plotW / (capacity - 1);

      // auto-scroll: el centro sigue la muestra más nueva (o se queda quieto)
      let target = centerRef.current;
      let tipIndex = -1;
      for (let i = buffer.length - 1; i >= 0; i--) {
        if (buffer[i] != null) {
          target = buffer[i] as number;
          tipIndex = i;
          break;
        }
      }
      centerRef.current = followCenter(centerRef.current, target, SMOOTH, CENTER_BOUNDS);
      const range = visibleRange(centerRef.current, SPAN);

      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, W, H);

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
        ctx.font = sharp ? "10px sans-serif" : "12px sans-serif";
        ctx.fillText(note.label, 6, y);
      }

      // bloques de nota (naranja): uno por muestra; el más nuevo, más vivo.
      for (let i = 0; i < buffer.length; i++) {
        const midi = buffer[i];
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
      for (let i = 0; i < buffer.length; i++) {
        const midi = buffer[i];
        if (midi == null || midi < range.low || midi > range.high) {
          drawing = false;
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
  }, [buffer, capacity, notation]);

  return <canvas ref={canvasRef} aria-hidden="true" className="h-full w-full" />;
}
