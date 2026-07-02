import type { KeyboardKey } from "../../lib/keyboard";
import { PianoKey } from "./PianoKey";

/** px — debe matchear el ancho de la tecla blanca (w-10 = 40px). */
const WHITE_WIDTH = 40;

interface KeyboardProps {
  keys: KeyboardKey[];
  active: ReadonlySet<number>;
  onPress: (midi: number) => void;
  onRelease: (midi: number) => void;
}

/**
 * Layout del teclado: blancas en fila, negras absolutas sobre el borde entre
 * blancas. Presentacional puro — recibe las teclas ya calculadas.
 */
export function Keyboard({ keys, active, onPress, onRelease }: KeyboardProps) {
  const whites = keys.filter((k) => !k.isSharp);
  const blacks = keys.filter((k) => k.isSharp);
  const whitesBefore = (midi: number) => whites.filter((w) => w.midi < midi).length;

  return (
    <div className="relative inline-flex rounded-md bg-surface p-2 shadow-lg">
      {whites.map((k) => (
        <PianoKey
          key={k.midi}
          k={k}
          active={active.has(k.midi)}
          onPress={onPress}
          onRelease={onRelease}
        />
      ))}
      {blacks.map((k) => (
        <PianoKey
          key={k.midi}
          k={k}
          active={active.has(k.midi)}
          onPress={onPress}
          onRelease={onRelease}
          // +8 = padding del contenedor (p-2); la negra se centra en el borde.
          style={{ left: 8 + whitesBefore(k.midi) * WHITE_WIDTH }}
        />
      ))}
    </div>
  );
}
