import { Piano } from "./components/piano/Piano";

export default function App() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-8 bg-slate-900 p-8">
      <h1 className="text-2xl font-bold text-slate-100">Ruta Tonal</h1>
      {/* ponytail: el tuner (sección superior) va acá arriba después */}
      <Piano />
    </main>
  );
}
