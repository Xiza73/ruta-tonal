import { useEffect, useState } from "react";
import { LyricsView } from "./components/lyrics/LyricsView";
import { Piano } from "./components/piano/Piano";
import { ProfileControls } from "./components/piano/ProfileControls";
import { SettingsDialog } from "./components/SettingsDialog";
import { ThemeToggle } from "./components/ThemeToggle";
import { MicButton } from "./components/tuner/MicButton";
import { PitchGraph } from "./components/tuner/PitchGraph";
import { pitchBuffer, TUNER_CAPACITY, useTunerStore } from "./stores/tuner";
import { useKeyboardProfile, useKeyboardStore } from "./stores/keyboard";
import { useThemeStore } from "./stores/theme";

type View = "entrenador" | "letras";

/** Las dos secciones son independientes; alcanza con alternar, sin router. */
function ViewSwitch({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  return (
    <div className="flex rounded-md bg-elevated p-0.5" role="tablist">
      {(["entrenador", "letras"] as const).map((option) => (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={view === option}
          onClick={() => onChange(option)}
          className={`rounded px-3 py-1 text-sm font-medium capitalize transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
            view === option ? "bg-accent text-accent-fg" : "text-fg-muted hover:text-fg"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>("entrenador");
  const profile = useKeyboardProfile();
  const notation = useKeyboardStore((s) => s.notation);
  const listening = useTunerStore((s) => s.listening);
  const label = useTunerStore((s) => s.label);
  const error = useTunerStore((s) => s.error);
  const configMode = useKeyboardStore((s) => s.configMode);
  const resetKeyMap = useKeyboardStore((s) => s.resetKeyMap);
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  if (view === "letras") {
    return (
      <main className="flex h-screen flex-col gap-4 overflow-hidden bg-base p-4">
        <div className="flex shrink-0 items-center justify-center gap-5">
          <ViewSwitch view={view} onChange={setView} />
          <ThemeToggle />
        </div>
        <section className="min-h-0 flex-1">
          <LyricsView />
        </section>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col gap-4 overflow-hidden bg-base p-4">
      {/* Superior: gráfico de afinación en el tiempo (crece). */}
      <section className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="mx-auto min-h-0 w-full max-w-[1400px] flex-1 overflow-hidden rounded-lg">
          <PitchGraph
            buffer={pitchBuffer}
            capacity={TUNER_CAPACITY}
            notation={notation}
            theme={theme}
          />
        </div>
        <p aria-live="polite" className="sr-only">
          {listening ? (label ? `Nota ${label}` : "Escuchando") : "Micrófono apagado"}
        </p>
      </section>

      {/* Inferior: barra de controles + teclado (alto fijo, compacto). */}
      <section className="flex shrink-0 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-center gap-5">
          <ViewSwitch view={view} onChange={setView} />
          <MicButton />
          <ProfileControls />
          <SettingsDialog />
        </div>
        {error && <p className="text-center text-sm text-danger">{error}</p>}
        {configMode && (
          <div className="flex items-center justify-center gap-3 text-xs text-fg-muted">
            <span>Clic en una tecla y apretá una tecla física para asignarla.</span>
            <button
              type="button"
              onClick={resetKeyMap}
              className="rounded-md bg-elevated px-2 py-1 font-medium hover:bg-border hover:text-fg focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            >
              Restablecer
            </button>
          </div>
        )}
        <div className="mx-auto h-[180px] w-full max-w-[1400px]">
          <Piano profile={profile} />
        </div>
      </section>
    </main>
  );
}
