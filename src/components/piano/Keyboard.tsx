import type { KeyboardKey } from "../../lib/keyboard";
import { PianoKey } from "./PianoKey";

/** Ancho máximo por tecla blanca (px). El piano crece con las octavas hasta este tope. */
const MAX_WHITE_PX = 64;
/** Ancho de la tecla negra como fracción del ancho de una blanca. */
const BLACK_RATIO = 0.62;

interface KeyboardProps {
  keys: KeyboardKey[];
  active: ReadonlySet<number>;
  onPress: (midi: number) => void;
  onRelease: (midi: number) => void;
}

/**
 * Layout del teclado: teclas fluidas (llenan el ancho) con un max-width que
 * depende de la cantidad de octavas. Negras absolutas, posicionadas en %.
 */
export function Keyboard({ keys, active, onPress, onRelease }: KeyboardProps) {
  const whites = keys.filter((k) => !k.isSharp);
  const blacks = keys.filter((k) => k.isSharp);
  const totalWhites = whites.length;
  const whitesBefore = (midi: number) => whites.filter((w) => w.midi < midi).length;
  const blackWidthPct = (100 / totalWhites) * BLACK_RATIO;

  return (
    <div
      className="relative mx-auto flex h-full w-full"
      style={{ maxWidth: totalWhites * MAX_WHITE_PX }}
    >
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
          style={{
            left: `${(whitesBefore(k.midi) / totalWhites) * 100}%`,
            width: `${blackWidthPct}%`,
          }}
        />
      ))}
    </div>
  );
}
