import { useEffect } from "react";
import { Piano } from "./components/piano/Piano";
import { KeyboardConfig } from "./components/piano/KeyboardConfig";
import { ConfigModeButton } from "./components/piano/ConfigModeButton";
import { ProfileControls } from "./components/piano/ProfileControls";
import { ThemeToggle } from "./components/ThemeToggle";
import { MicButton } from "./components/tuner/MicButton";
import { NoteReadout } from "./components/tuner/NoteReadout";
import { PitchGraph } from "./components/tuner/PitchGraph";
import { pitchBuffer, TUNER_CAPACITY, useTunerStore } from "./stores/tuner";
import { useKeyboardProfile, useKeyboardStore } from "./stores/keyboard";
import { useThemeStore } from "./stores/theme";

export default function App() {
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

  return (
    <main className="flex h-screen flex-col gap-4 overflow-hidden bg-base p-4">
      {/* Superior: readout de la nota + gráfico de afinación (crece). */}
      <section className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex h-14 shrink-0 items-baseline justify-center">
          <NoteReadout />
        </div>
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
          <MicButton />
          <ProfileControls />
          <KeyboardConfig />
          <ConfigModeButton />
          <ThemeToggle />
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
