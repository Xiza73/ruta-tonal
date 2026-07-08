import { useTunerStore } from "../../stores/tuner";
import { centsColor } from "../../lib/pitch-graph";

/** Lectura grande de la nota detectada, en Instrument Serif y coloreada por afinación. */
export function NoteReadout() {
  const listening = useTunerStore((s) => s.listening);
  const current = useTunerStore((s) => s.current);

  if (!listening) {
    return <span className="font-display text-3xl text-fg-subtle italic">—</span>;
  }
  if (!current) {
    return <span className="text-sm tracking-widest text-fg-subtle uppercase">Escuchando…</span>;
  }

  const color = centsColor(current.cents);
  return (
    <div className="flex items-baseline gap-3">
      <span
        className="font-display text-5xl leading-none italic"
        style={{ color, textShadow: `0 0 24px ${color}55` }}
      >
        {current.label}
      </span>
      <span className="text-sm tabular-nums" style={{ color }}>
        {current.cents > 0 ? "+" : ""}
        {current.cents}¢
      </span>
    </div>
  );
}
