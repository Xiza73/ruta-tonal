import { useEffect, useRef } from "react";
import { midiToNote, type Notation } from "../../lib/notes";
import { centsColor, followCenter, midiToY, visibleRange } from "../../lib/pitch-graph";

const GUTTER = 40; // columna de etiquetas de nota a la izquierda
const RIGHT_GUTTER = 40; // etiquetas también a la derecha (donde nacen las notas)
const SPAN = 24; // semitonos visibles (2 octavas)
const SMOOTH = 0.12; // suavizado del auto-scroll vertical
const CENTER_BOUNDS = { low: 48, high: 72 }; // el centro se mueve entre C3 y C5
const INITIAL_CENTER = 60; // C4

// El gráfico es una "pantalla" oscura navy en ambos temas (como un osciloscopio).
const PALETTES = {
  dark: {
    bg: "#070a12",
    rowNatural: "#0d1220",
    rowSharp: "#0a0e18",
    octaveLine: "#16324a",
    label: "#dde6f5",
    labelDim: "#6b7fa3",
    trace: "#ffffff",
  },
  light: {
    bg: "#16273f", // azul medio (más claro que el navy, acompaña el pastel)
    rowNatural: "#1e3352",
    rowSharp: "#192b47",
    octaveLine: "#2c4d72",
    label: "#dce8f9",
    labelDim: "#8092b4",
    trace: "#ffffff",
  },
} as const;


interface PitchGraphProps {
  /** Historial de pitch continuo (MIDI o null), viejo→nuevo. Mutado in-place. */
  buffer: (number | null)[];
  capacity: number;
  notation: Notation;
  /** Tema activo: elige la paleta del gráfico. */
  theme: "dark" | "light";
}

/**
 * Gráfico de afinación en el tiempo (piano roll con auto-scroll vertical).
 * Ancho y alto responsive, a devicePixelRatio. Pantalla oscura en ambos temas.
 */
export function PitchGraph({ buffer, capacity, notation, theme }: PitchGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const centerRef = useRef(INITIAL_CENTER);
  const hadDataRef = useRef(false); // ¿había datos el frame anterior?

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return; // jsdom no implementa canvas 2d → no rompe

    const COLORS = PALETTES[theme];

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
      const plotW = W - GUTTER - RIGHT_GUTTER;
      const rowH = H / SPAN;
      const stepX = plotW / (capacity - 1);

      let target = centerRef.current;
      let tipIndex = -1;
      for (let i = buffer.length - 1; i >= 0; i--) {
        if (buffer[i] != null) {
          target = buffer[i] as number;
          tipIndex = i;
          break;
        }
      }
      if (tipIndex === -1) {
        hadDataRef.current = false; // buffer vacío (mic apagado / silencio total)
      } else {
        // Al reaparecer datos tras estar vacío, SNAP el centro (smooth=1) para
        // no quedar scrolleando lento desde la nota vieja al reactivar el mic.
        const smooth = hadDataRef.current ? SMOOTH : 1;
        centerRef.current = followCenter(centerRef.current, target, smooth, CENTER_BOUNDS);
        hadDataRef.current = true;
      }
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
          ctx.lineTo(W - RIGHT_GUTTER, y + rowH / 2);
          ctx.stroke();
        }

        ctx.fillStyle = sharp ? COLORS.labelDim : COLORS.label;
        ctx.font = sharp ? "10px Quicksand, sans-serif" : "600 12px Quicksand, sans-serif";
        ctx.textAlign = "center"; // padding parejo a ambos lados en cada columna
        ctx.fillText(note.label, GUTTER / 2, y);
        ctx.fillText(note.label, W - RIGHT_GUTTER / 2, y);
      }
      ctx.textAlign = "left";

      // bloques coloreados por afinación; el más nuevo, más opaco.
      for (let i = 0; i < buffer.length; i++) {
        const midi = buffer[i];
        if (midi == null) continue;
        const note = Math.round(midi);
        if (note < range.low || note > range.high) continue;
        const cents = (midi - note) * 100;
        const y = midiToY(note, range) * H;
        ctx.fillStyle = centsColor(cents);
        ctx.globalAlpha = i === tipIndex ? 0.95 : 0.5;
        ctx.fillRect(GUTTER + i * stepX, y - rowH / 2, stepX + 1, rowH);
      }
      ctx.globalAlpha = 1;

      // traza continua con glow, encima
      ctx.save();
      ctx.shadowColor = "rgba(255, 255, 255, 0.55)";
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
  }, [buffer, capacity, notation, theme]);

  return <canvas ref={canvasRef} aria-hidden="true" className="h-full w-full" />;
}
