import { Piano } from "./components/piano/Piano";
import { KeyboardConfig } from "./components/piano/KeyboardConfig";
import { Tuner } from "./components/tuner/Tuner";
import { useKeyboardProfile } from "./stores/keyboard";

export default function App() {
  const profile = useKeyboardProfile();

  return (
    <main className="flex min-h-screen flex-col items-center gap-10 bg-base p-8">
      <h1 className="text-2xl font-bold text-fg">Ruta Tonal</h1>
      {/* Sección superior: detector por micrófono. */}
      <Tuner />
      {/* Sección inferior: teclado configurable. */}
      <div className="flex flex-col items-center gap-4">
        <KeyboardConfig />
        <Piano profile={profile} />
      </div>
    </main>
  );
}
