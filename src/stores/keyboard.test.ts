import { useKeyboardStore } from "./keyboard";

const reset = () =>
  useKeyboardStore.setState({
    notation: "scientific",
    octaves: 2,
    startMidi: 48,
    soundType: "triangle",
    customKeyMap: null,
    configMode: false,
  });

beforeEach(reset);

test("los setters actualizan el estado", () => {
  const { setNotation, setOctaves, setSoundType } = useKeyboardStore.getState();
  setNotation("solfege");
  setOctaves(3);
  setSoundType("square");

  const s = useKeyboardStore.getState();
  expect(s.notation).toBe("solfege");
  expect(s.octaves).toBe(3);
  expect(s.soundType).toBe("square");
});

test("bindKey asigna una tecla a un offset", () => {
  useKeyboardStore.getState().bindKey("KeyP", 5);
  expect(useKeyboardStore.getState().customKeyMap?.["KeyP"]).toBe(5);
});

test("bindKey deja una sola tecla por nota (libera la previa)", () => {
  const { bindKey } = useKeyboardStore.getState();
  bindKey("KeyP", 5);
  bindKey("KeyO", 5); // misma nota, otra tecla
  const map = useKeyboardStore.getState().customKeyMap!;
  expect(map["KeyO"]).toBe(5);
  expect(map["KeyP"]).toBeUndefined();
});

test("resetKeyMap vuelve al default (null)", () => {
  useKeyboardStore.getState().bindKey("KeyP", 5);
  useKeyboardStore.getState().resetKeyMap();
  expect(useKeyboardStore.getState().customKeyMap).toBeNull();
});
