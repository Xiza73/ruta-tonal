import { useEffect, useRef, useState } from "react";
import { createSynth, type Synth, type Voice } from "../../audio/synth";
import {
  DEFAULT_PROFILE,
  keysForProfile,
  midiForCode,
  type KeyboardProfile,
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
  const synthRef = useRef<Synth | null>(null);
  const voicesRef = useRef(new Map<number, Voice>());
  const [active, setActive] = useState<ReadonlySet<number>>(new Set());
  const [selectedOffset, setSelectedOffset] = useState<number | null>(null);

  function getSynth() {
    synthRef.current ??= createSynth({ type: profile.soundType });
    return synthRef.current;
  }

  useEffect(() => () => synthRef.current?.dispose(), []);
  useEffect(() => {
    synthRef.current?.setType(profile.soundType);
  }, [profile.soundType]);
  useEffect(() => {
    // Limpia la selección al salir del modo config (sync con estado externo).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!configMode) setSelectedOffset(null);
  }, [configMode]);

  function press(midi: number) {
    if (voicesRef.current.has(midi)) return;
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
