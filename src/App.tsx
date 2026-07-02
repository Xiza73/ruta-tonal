import { Piano } from "./components/piano/Piano";
import { KeyboardConfig } from "./components/piano/KeyboardConfig";
import { ConfigModeButton } from "./components/piano/ConfigModeButton";
import { MicButton } from "./components/tuner/MicButton";
import { PitchGraph } from "./components/tuner/PitchGraph";
import { pitchBuffer, TUNER_CAPACITY, useTunerStore } from "./stores/tuner";
import { useKeyboardProfile, useKeyboardStore } from "./stores/keyboard";

export default function App() {
  const profile = useKeyboardProfile();
  const notation = useKeyboardStore((s) => s.notation);
  const listening = useTunerStore((s) => s.listening);
  const label = useTunerStore((s) => s.label);
  const error = useTunerStore((s) => s.error);
  const configMode = useKeyboardStore((s) => s.configMode);
  const resetKeyMap = useKeyboardStore((s) => s.resetKeyMap);

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-base">
      {/* Superior (~2/3): gráfico de afinación. */}
      <section className="min-h-0 flex-[2] p-3">
        <div className="mx-auto h-full w-full max-w-[1400px] overflow-hidden rounded-lg">
          <PitchGraph buffer={pitchBuffer} capacity={TUNER_CAPACITY} notation={notation} />
        </div>
        <p aria-live="polite" className="sr-only">
          {listening ? (label ? `Nota ${label}` : "Escuchando") : "Micrófono apagado"}
        </p>
      </section>

      {/* Inferior (~1/3): barra de controles + teclado. */}
      <section className="flex min-h-0 flex-[1] flex-col gap-3 px-3 pb-3">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <MicButton />
          <KeyboardConfig />
          <ConfigModeButton />
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
        <div className="mx-auto min-h-0 w-full max-w-[1400px] flex-1">
          <Piano profile={profile} />
        </div>
      </section>
    </main>
  );
}
