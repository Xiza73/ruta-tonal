import type { ReactNode } from "react";
import { Piano } from "./components/piano/Piano";
import { KeyboardConfig } from "./components/piano/KeyboardConfig";
import { Tuner } from "./components/tuner/Tuner";
import { useKeyboardProfile } from "./stores/keyboard";

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="w-full max-w-3xl rounded-xl bg-surface p-6 shadow-card">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-fg">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-fg-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export default function App() {
  const profile = useKeyboardProfile();

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 bg-base px-4 py-10">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-fg">Ruta Tonal</h1>
        <p className="mt-1 text-sm text-fg-muted">Identificá y entrená notas musicales</p>
      </header>

      {/* Sección superior: detector por micrófono. */}
      <Panel title="Afinador" subtitle="Cantá o tocá una nota y seguí tu afinación en el tiempo">
        <Tuner />
      </Panel>

      {/* Sección inferior: teclado configurable. */}
      <Panel title="Teclado" subtitle="Tocá con el mouse o el teclado de tu compu">
        <div className="flex flex-col items-center gap-5">
          <KeyboardConfig />
          <Piano profile={profile} />
        </div>
      </Panel>
    </main>
  );
}
