import { useEffect, useState } from "react";
import { Timer as TimerIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { playChime } from "../../audio/chime";
import { DurationField } from "./DurationField";
import { elapsedFraction, formatDuration, remainingSeconds } from "../../lib/timer";
import { useTimerStore } from "../../stores/timer";

/** Anillo de progreso: se lee de reojo, sin tener que leer los números. */
function ProgressRing({ fraction, alert }: { fraction: number; alert: boolean }) {
  const radius = 92;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
      <circle cx="100" cy="100" r={radius} fill="none" strokeWidth="6" className="stroke-border" />
      <circle
        cx="100"
        cy="100"
        r={radius}
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - fraction)}
        className={alert ? "stroke-success" : "stroke-accent"}
      />
    </svg>
  );
}

/**
 * Temporizador de práctica.
 *
 * Sigue corriendo con el modal cerrado — el botón de la barra muestra lo que
 * falta. Un temporizador que se cancela al cerrar la ventana no sirve.
 */
export function TimerDialog() {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null);

  const duration = useTimerStore((s) => s.duration);
  const endsAt = useTimerStore((s) => s.endsAt);
  const pausedAt = useTimerStore((s) => s.pausedAt);
  const finished = useTimerStore((s) => s.finished);
  const setDuration = useTimerStore((s) => s.setDuration);
  const start = useTimerStore((s) => s.start);
  const pause = useTimerStore((s) => s.pause);
  const reset = useTimerStore((s) => s.reset);
  const finish = useTimerStore((s) => s.finish);

  const running = endsAt !== null;
  const [ticking, setTicking] = useState(0);

  // Detenido, lo que falta es DERIVADO: no hace falta estado. Terminado es
  // cero; pausado, lo que quedaba; si no, la duracion configurada.
  const remaining = running ? ticking : finished ? 0 : (pausedAt ?? duration);

  // Dos relojes con responsabilidades distintas, los dos leyendo el MISMO
  // `endsAt`, asi que no se pueden desincronizar.
  useEffect(() => {
    if (endsAt === null) return;

    // 1) El DIBUJO va por frame: suave y gratis cuando la ventana se ve. Cada
    //    frame recalcula contra el reloj en vez de acumular, asi que no deriva.
    let raf = 0;
    const draw = () => {
      const left = remainingSeconds(endsAt, performance.now());
      setTicking(left);
      if (left > 0) raf = requestAnimationFrame(draw);
    };
    // Arranca en el proximo frame y no en el cuerpo del efecto: setState
    // sincronico ahi dispara renders en cascada.
    raf = requestAnimationFrame(draw);

    // 2) El FIN va por timeout, y esto no es redundancia: requestAnimationFrame
    //    NO dispara con la ventana oculta o minimizada. Colgando el final del
    //    dibujo, minimizar la app hacia que el temporizador nunca avisara —
    //    justo cuando mas falta que avise.
    const alarm = setTimeout(
      () => {
        finish();
        playChime();
      },
      Math.max(0, endsAt - performance.now()),
    );

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(alarm);
    };
  }, [endsAt, finish]);

  useEffect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open, dialog]);

  function handleKey(event: React.KeyboardEvent) {
    // Los atajos NO deben robarle las teclas a los segmentos editables.
    if ((event.target as HTMLElement).getAttribute("role") === "spinbutton") return;
    if (event.key === " ") {
      event.preventDefault();
      if (running) pause();
      else start();
    }
    if (event.key.toLowerCase() === "r") reset();
  }

  const label = running || pausedAt !== null ? formatDuration(remaining) : formatDuration(duration);

  return (
    <>
      <Button
        variant="ghost"
        size={running ? "sm" : "icon"}
        aria-label={running ? `Temporizador, faltan ${label}` : "Temporizador"}
        onClick={() => setOpen(true)}
        className={running ? "font-mono tabular-nums text-accent" : "text-fg-muted hover:text-fg"}
      >
        <TimerIcon />
        {/* Corriendo, el botón muestra lo que falta: con el modal cerrado es la
            única forma de ver el temporizador. */}
        {running && <span>{label}</span>}
      </Button>

      <dialog
        ref={setDialog}
        aria-label="Temporizador"
        onClose={() => setOpen(false)}
        onKeyDown={handleKey}
        className="m-auto w-full max-w-sm rounded-xl border border-border bg-surface p-0 text-fg shadow-raised backdrop:bg-black/60"
      >
        <div className="flex flex-col items-center gap-5 p-6">
          <div className="flex w-full items-center justify-between">
            <h2 className="text-lg font-semibold text-fg">Temporizador</h2>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </div>

          <div className="relative flex h-52 w-52 items-center justify-center">
            <ProgressRing
              fraction={elapsedFraction(duration, remaining)}
              alert={finished}
            />
            <DurationDisplay
              running={running}
              finished={finished}
              remaining={remaining}
              duration={duration}
              onChange={setDuration}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={running ? pause : start} disabled={duration === 0}>
              {running ? "Pausar" : pausedAt !== null ? "Reanudar" : "Empezar"}
            </Button>
            <Button variant="outline" onClick={reset} disabled={!running && pausedAt === null && !finished}>
              Reiniciar
            </Button>
          </div>

          <p className="text-center text-xs text-fg-subtle">
            Tocá los minutos o los segundos para editarlos. Flechas para ajustar, Shift de a 10.
            <br />
            Espacio arranca y pausa · R reinicia
          </p>
        </div>
      </dialog>
    </>
  );
}

/** Mientras corre muestra; detenido, deja editar. */
function DurationDisplay({
  running,
  finished,
  remaining,
  duration,
  onChange,
}: {
  running: boolean;
  finished: boolean;
  remaining: number;
  duration: number;
  onChange: (seconds: number) => void;
}) {
  if (running || finished) {
    return (
      <output
        aria-live="off"
        className={`font-mono text-6xl font-semibold tabular-nums ${
          finished ? "text-success" : "text-fg"
        }`}
      >
        {formatDuration(remaining)}
      </output>
    );
  }
  return <DurationField total={duration} onChange={onChange} />;
}
