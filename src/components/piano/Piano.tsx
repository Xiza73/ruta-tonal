import { useEffect, useRef, useState } from "react";
import { createSynth, type Synth, type Voice } from "../../audio/synth";
import {
  DEFAULT_PROFILE,
  keysForProfile,
  midiForCode,
  type KeyboardProfile,
} from "../../lib/keyboard";
import { Keyboard } from "./Keyboard";

interface PianoProps {
  profile?: KeyboardProfile;
}

/**
 * Container del piano: dueño del synth y del input (mouse + teclado físico).
 * Toda la lógica de audio vive acá; Keyboard/PianoKey son presentacionales.
 */
export function Piano({ profile = DEFAULT_PROFILE }: PianoProps) {
  const synthRef = useRef<Synth | null>(null);
  const voicesRef = useRef(new Map<number, Voice>());
  const [active, setActive] = useState<ReadonlySet<number>>(new Set());

  // Synth perezoso: se crea en el primer gesto (autoplay policy del browser).
  function getSynth() {
    synthRef.current ??= createSynth({ type: profile.soundType });
    return synthRef.current;
  }

  useEffect(() => () => synthRef.current?.dispose(), []);
  useEffect(() => {
    synthRef.current?.setType(profile.soundType);
  }, [profile.soundType]);

  function press(midi: number) {
    if (voicesRef.current.has(midi)) return; // ya sonando (evita re-trigger)
    const synth = getSynth();
    void synth.resume();
    voicesRef.current.set(midi, synth.play(midi));
    setActive((prev) => new Set(prev).add(midi));
  }

  function release(midi: number) {
    const voice = voicesRef.current.get(midi);
    if (!voice) return;
    voice.release();
    voicesRef.current.delete(midi);
    setActive((prev) => {
      const next = new Set(prev);
      next.delete(midi);
      return next;
    });
  }

  // Teclado físico de la compu → notas. press/release son estables (usan refs).
  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.repeat) return;
      const midi = midiForCode(profile, e.code);
      if (midi !== undefined) press(midi);
    }
    function up(e: KeyboardEvent) {
      const midi = midiForCode(profile, e.code);
      if (midi !== undefined) release(midi);
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- press/release estables vía refs
  }, [profile]);

  return (
    <section className="flex flex-col items-center gap-4">
      <Keyboard
        keys={keysForProfile(profile)}
        active={active}
        onPress={press}
        onRelease={release}
      />
      <p className="text-sm text-fg-muted">
        Tocá con el mouse o el teclado: A S D F G H J K (blancas) · W E T Y U (negras).
      </p>
    </section>
  );
}
