import { useState } from "react";
import { STAGES, type LyricNote, type Stage } from "../../lib/lyrics-pipeline";
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

/** Corta la lista plana en los versos de la letra. */
export function groupIntoLines(words: LyricNote[]): LyricNote[][] {
  const lines: LyricNote[][] = [];
  for (const word of words) {
    if (lines.length === 0 || word.line !== lines[lines.length - 1][0].line) lines.push([]);
    lines[lines.length - 1].push(word);
  }
  return lines;
}

export interface Run {
  note: string | null;
  inferred: boolean;
  words: LyricNote[];
}

/**
 * Agrupa palabras seguidas que comparten nota.
 *
 * Repetir "C4 C4 C4" sobre tres palabras seguidas no dice que son tres notas:
 * es una sola sostenida. Agrupadas se lee lo que pasa de verdad.
 */
export function groupIntoRuns(line: LyricNote[]): Run[] {
  const runs: Run[] = [];
  for (const word of line) {
    const label = word.note?.label ?? null;
    const last = runs[runs.length - 1];
    if (last && last.note === label && label !== null) {
      last.words.push(word);
      // El grupo es "deducido" solo si TODAS lo son; con una medida, se sostiene.
      last.inferred = last.inferred && word.inferred;
    } else {
      runs.push({ note: label, inferred: word.inferred, words: [word] });
    }
  }
  return runs;
}

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
  const exportDir = useLyricsStore((s) => s.exportDir);
  const exportedAt = useLyricsStore((s) => s.exportedAt);
  const exportMarkdown = useLyricsStore((s) => s.exportMarkdown);
  const pickExportDir = useLyricsStore((s) => s.pickExportDir);
  const openExportDir = useLyricsStore((s) => s.openExportDir);

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

      {/* Fuera del bloque de resultados a propósito: abrir la carpeta sirve para
          ver TODAS las canciones exportadas, no solo la recién procesada. */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-surface px-4 py-3 shadow-card">
        <span className="text-xs text-fg-muted">Carpeta de exportación:</span>
        {exportDir ? (
          <>
            <code className="truncate font-mono text-xs text-fg" title={exportDir}>
              {exportDir}
            </code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="ml-auto"
              onClick={() => void openExportDir()}
            >
              Abrir carpeta
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => void pickExportDir()}>
              Cambiar
            </Button>
          </>
        ) : (
          <>
            <span className="text-xs text-fg-subtle">sin elegir</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="ml-auto"
              onClick={() => void pickExportDir()}
            >
              Elegir carpeta
            </Button>
          </>
        )}
      </div>

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-fg-muted">
              {words.length} palabras · {Math.round(withNote * 100)}% con nota ·{" "}
              {Math.round(anchored * 100)}% con tiempo medido
              {anchored < 1 && <span className="text-fg-subtle"> (el resto, interpolado)</span>}
            </p>

            <Button type="button" size="sm" onClick={() => void exportMarkdown()}>
              Exportar .md
            </Button>
          </div>

          {exportedAt && (
            <p className="text-xs text-success" role="status">
              Guardado en {exportedAt}
            </p>
          )}

          <div className="flex flex-col gap-3 rounded-lg bg-surface p-5 shadow-card">
            {groupIntoLines(words).map((line, l) => (
              <p key={l} className="flex flex-wrap items-end gap-x-2 gap-y-3">
                {groupIntoRuns(line).map((run, r) => (
                  <span key={r} className="flex flex-col items-center leading-tight">
                    <span
                      className={`font-mono text-xs ${
                        !run.note
                          ? "text-fg-subtle"
                          : run.inferred
                            ? "text-accent/50"
                            : "text-accent"
                      }`}
                      // Una nota deducida no se midió: se dedujo de las vecinas.
                      title={run.inferred ? "Deducida de las palabras vecinas" : undefined}
                    >
                      {run.note ?? "·"}
                    </span>
                    {/* La línea abarca todas las palabras que comparten la nota,
                        así se ve de un vistazo que es una sola nota sostenida. */}
                    <span
                      className={`flex gap-x-2 px-1 ${
                        run.note ? "border-t border-accent/25" : "border-t border-transparent"
                      }`}
                    >
                      {run.words.map((word, w) => (
                        <span key={w} className="text-fg">
                          {word.text}
                        </span>
                      ))}
                    </span>
                  </span>
                ))}
              </p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
