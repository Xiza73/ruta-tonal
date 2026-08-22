import { useRef, useState } from "react";
import {
  commitSegment,
  formatSegment,
  segmentMax,
  splitDuration,
  stepDuration,
  typeDigit,
  type Segment,
} from "../../lib/timer";

/**
 * El display ES el input: se toca el segmento a editar y se escribe.
 *
 * Sin campos aparte ni spinners nativos, que son blancos de toque diminutos y
 * entran en estado inválido con cualquier tecla. Cada segmento es un
 * `spinbutton`, que es el rol ARIA de esto y le da a un lector de pantalla el
 * valor, el rango y las flechas sin trabajo extra.
 */
export function DurationField({
  total,
  onChange,
  disabled,
}: {
  total: number;
  onChange: (seconds: number) => void;
  disabled?: boolean;
}) {
  const { minutes, seconds } = splitDuration(total);
  const [editing, setEditing] = useState<Segment | null>(null);
  const [draft, setDraft] = useState("");
  const secondsRef = useRef<HTMLButtonElement>(null);

  function handleKey(segment: Segment, event: React.KeyboardEvent) {
    const max = segmentMax(segment);

    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      const result = typeDigit(draft, event.key, max);
      setDraft(result.draft);
      onChange(commitSegment(total, segment, Number(result.draft)));
      if (result.done) {
        setDraft("");
        // De minutos pasa solo a segundos, como en cualquier campo de hora.
        if (segment === "minutes") secondsRef.current?.focus();
      }
      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      setDraft("");
      // Shift mueve de a 10 para no tener que mantener la flecha apretada.
      const amount = (event.key === "ArrowUp" ? 1 : -1) * (event.shiftKey ? 10 : 1);
      onChange(stepDuration(total, segment, amount));
      return;
    }

    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      setDraft("");
      onChange(commitSegment(total, segment, 0));
    }
  }

  const segmentClass = (segment: Segment) =>
    [
      "rounded-lg px-2 tabular-nums transition-colors",
      "focus-visible:outline-none",
      disabled ? "cursor-default text-fg-muted" : "cursor-text hover:bg-elevated",
      editing === segment && !disabled ? "bg-accent/15 text-accent" : "text-fg",
    ].join(" ");

  function segmentButton(segment: Segment, value: number, label: string) {
    // Mientras se escribe se muestra el borrador tal cual (`5` y no `05`), así
    // se ve que hay un dígito a medio cargar.
    const shown =
      editing === segment && draft !== "" ? draft.padStart(2, "0") : formatSegment(value);
    return (
      <button
        ref={segment === "seconds" ? secondsRef : undefined}
        type="button"
        role="spinbutton"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={segmentMax(segment)}
        aria-valuetext={`${value} ${label}`}
        disabled={disabled}
        onFocus={() => {
          setEditing(segment);
          setDraft("");
        }}
        onBlur={() => {
          setEditing(null);
          setDraft("");
        }}
        onKeyDown={(e) => handleKey(segment, e)}
        className={segmentClass(segment)}
      >
        {shown}
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label="Duración"
      className="flex items-center justify-center font-mono text-6xl font-semibold select-none"
    >
      {segmentButton("minutes", minutes, "minutos")}
      <span aria-hidden="true" className="text-fg-subtle">
        :
      </span>
      {segmentButton("seconds", seconds, "segundos")}
    </div>
  );
}
