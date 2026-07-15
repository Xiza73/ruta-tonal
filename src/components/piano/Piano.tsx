import { useEffect, useRef, useState } from "react";
import { createSynth, type Synth, type Voice } from "../../audio/synth";
import { createSampler } from "../../audio/sampler";
import {
  DEFAULT_PROFILE,
  keysForProfile,
  midiForCode,
  type KeyboardProfile,
  type SoundType,
} from "../../lib/keyboard";
import { useKeyboardStore } from "../../stores/keyboard";
import { Keyboard } from "./Keyboard";

interface PianoProps {
  profile?: KeyboardProfile;
}

/**
 * Container del piano: dueño del synth y del input.
 * En modo configuración el piano no suena: al clickear una tecla se selecciona
 * la nota y la próxima tecla física apretada queda asignada a ese offset.
 */
export function Piano({ profile = DEFAULT_PROFILE }: PianoProps) {
  const configMode = useKeyboardStore((s) => s.configMode);
  const bindKey = useKeyboardStore((s) => s.bindKey);
  const engineRef = useRef<Synth | null>(null);
  const engineTypeRef = useRef<SoundType | null>(null);
  const voicesRef = useRef(new Map<number, Voice>());
  const [active, setActive] = useState<ReadonlySet<number>>(new Set());
  const [selectedOffset, setSelectedOffset] = useState<number | null>(null);

  // Elige el motor según el sonido: samples (piano real) u oscilador.
  function ensureEngine(soundType: SoundType): Synth {
    if (engineRef.current && engineTypeRef.current === soundType) return engineRef.current;
    // oscilador → oscilador: solo cambiar el tipo, sin recrear
    if (engineRef.current && soundType !== "piano" && engineTypeRef.current !== "piano") {
      engineRef.current.setType(soundType);
      engineTypeRef.current = soundType;
      return engineRef.current;
    }
    engineRef.current?.dispose();
    engineRef.current = soundType === "piano" ? createSampler() : createSynth({ type: soundType });
    engineTypeRef.current = soundType;
    return engineRef.current;
  }

  useEffect(() => () => engineRef.current?.dispose(), []);

  // Precarga: al primer gesto (en cualquier lado), crea el motor para que las
  // muestras del piano empiecen a cargar antes de que toques una tecla.
  useEffect(() => {
    const preload = () => ensureEngine(useKeyboardStore.getState().soundType);
    window.addEventListener("pointerdown", preload, { once: true });
    window.addEventListener("keydown", preload, { once: true });
    return () => {
      window.removeEventListener("pointerdown", preload);
      window.removeEventListener("keydown", preload);
    };
  }, []);

  useEffect(() => {
    // Limpia la selección al salir del modo config (sync con estado externo).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!configMode) setSelectedOffset(null);
  }, [configMode]);

  function press(midi: number) {
    if (voicesRef.current.has(midi)) return;
    const engine = ensureEngine(profile.soundType);
    void engine.resume();
    voicesRef.current.set(midi, engine.play(midi));
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

  // Interacción con el mouse según el modo.
  function handlePress(midi: number) {
    if (configMode) {
      setSelectedOffset(midi - profile.range.low); // seleccionar nota, esperar tecla
      return;
    }
    press(midi);
  }
  function handleRelease(midi: number) {
    if (!configMode) release(midi);
  }

  // Teclado físico: tocar, o (en config) asignar la tecla a la nota seleccionada.
  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.repeat) return;
      if (configMode) {
        if (selectedOffset !== null) {
          bindKey(e.code, selectedOffset);
          setSelectedOffset(null);
        }
        return;
      }
      const midi = midiForCode(profile, e.code);
      if (midi !== undefined) press(midi);
    }
    function up(e: KeyboardEvent) {
      if (configMode) return;
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
  }, [profile, configMode, selectedOffset]);

  const selectedMidi = selectedOffset === null ? null : profile.range.low + selectedOffset;

  return (
    <Keyboard
      keys={keysForProfile(profile)}
      active={active}
      configMode={configMode}
      selectedMidi={selectedMidi}
      onPress={handlePress}
      onRelease={handleRelease}
    />
  );
}
