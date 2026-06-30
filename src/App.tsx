import { Piano } from "./components/piano/Piano";
import { Tuner } from "./components/tuner/Tuner";

export default function App() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-10 bg-slate-900 p-8">
      <h1 className="text-2xl font-bold text-slate-100">Ruta Tonal</h1>
      {/* Sección superior: detector por micrófono. */}
      <Tuner />
      {/* Sección inferior: teclado virtual. */}
      <Piano />
    </main>
  );
}
