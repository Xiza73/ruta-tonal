import { useState } from "react";
import { STAGES, type Stage } from "../../lib/lyrics-pipeline";
import { useLyricsStore } from "../../stores/lyrics";
import { Button } from "../ui/button";

const STAGE_LABEL: Record<Stage, string> = {
  descarga: "Bajando el audio",
  separacion: "Aislando la voz",
  transcripcion: "Reconociendo palabras",
  letra: "Buscando la letra",
  alineado: "Alineando",
};

/** Las tres primeras son minutos, no segundos. Conviene avisarlo. */
const SLOW: Stage[] = ["descarga", "separacion", "transcripcion"];

function StageList({ current }: { current: Stage }) {
  const currentIndex = STAGES.indexOf(current);
  return (
    <ol className="flex flex-col gap-1.5">
      {STAGES.map((stage, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li
            key={stage}
            className={
              active
                ? "text-accent"
                : done
                  ? "text-fg-muted line-through decoration-fg-subtle"
                  : "text-fg-subtle"
            }
          >
            <span className="font-mono text-xs">{done ? "✓" : active ? "▸" : "·"}</span>{" "}
            {STAGE_LABEL[stage]}
            {active && SLOW.includes(stage) && (
              <span className="text-fg-muted"> — esto tarda unos minutos</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function LyricsView() {
  const [url, setUrl] = useState("");
  const [artist, setArtist] = useState("");
  const [track, setTrack] = useState("");

  const running = useLyricsStore((s) => s.running);
  const stage = useLyricsStore((s) => s.stage);
  const error = useLyricsStore((s) => s.error);
  const words = useLyricsStore((s) => s.words);
  const anchored = useLyricsStore((s) => s.anchored);
  const withNote = useLyricsStore((s) => s.withNote);
  const process = useLyricsStore((s) => s.process);

  const ready = url.trim() && artist.trim() && track.trim() && !running;

  const field =
    "w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-50";

  return (
    <div className="mx-auto flex h-full w-full max-w-[1000px] flex-col gap-5 overflow-y-auto p-1">
      <form
        className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-card"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) void process({ url: url.trim(), artist: artist.trim(), track: track.trim() });
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="text-xs text-fg-muted">Link de YouTube</span>
          <input
            className={field}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={running}
            placeholder="https://www.youtube.com/watch?v=…"
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs text-fg-muted">Artista</span>
            <input
              className={field}
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              disabled={running}
              placeholder="Zoé"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs text-fg-muted">Título</span>
            <input
              className={field}
              value={track}
              onChange={(e) => setTrack(e.target.value)}
              disabled={running}
              placeholder="Labios Rotos"
            />
          </label>
        </div>

        {/* Artista y título van a mano: se usan para elegir la versión correcta
            en LRCLIB, donde un mismo tema tiene decenas de grabaciones. */}
        <p className="text-xs text-fg-subtle">
          El artista y el título se usan para buscar la letra. La versión se elige por duración,
          así no se mezcla el vivo con el de estudio.
        </p>

        <Button type="submit" disabled={!ready} className="self-start">
          {running ? "Procesando…" : "Procesar"}
        </Button>
      </form>

      {running && stage && (
        <div className="rounded-lg bg-surface p-4 text-sm shadow-card">
          <StageList current={stage} />
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-surface p-4 text-sm text-danger shadow-card">
          {error}
        </p>
      )}

      {words.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="text-xs text-fg-muted">
            {words.length} palabras · {Math.round(withNote * 100)}% con nota ·{" "}
            {Math.round(anchored * 100)}% con tiempo medido
            {anchored < 1 && <span className="text-fg-subtle"> (el resto, interpolado)</span>}
          </p>

          <div className="flex flex-wrap gap-x-3 gap-y-4 rounded-lg bg-surface p-4 shadow-card">
            {words.map((word, i) => (
              <span key={`${i}-${word.text}`} className="flex flex-col items-center leading-tight">
                <span
                  className={
                    word.note ? "font-mono text-xs text-accent" : "font-mono text-xs text-fg-subtle"
                  }
                >
                  {word.note?.label ?? "—"}
                </span>
                <span className="text-fg">{word.text}</span>
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
