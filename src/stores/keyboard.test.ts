import { useKeyboardStore } from "./keyboard";

const reset = () =>
  useKeyboardStore.setState({
    notation: "scientific",
    octaves: 2,
    startMidi: 48,
    soundType: "triangle",
    customKeyMap: null,
    configMode: false,
    profiles: [],
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

test("saveProfile guarda la config actual como perfil nombrado", () => {
  useKeyboardStore.getState().setOctaves(3);
  useKeyboardStore.getState().saveProfile("Mi perfil");
  const { profiles } = useKeyboardStore.getState();
  expect(profiles).toHaveLength(1);
  expect(profiles[0].name).toBe("Mi perfil");
  expect(profiles[0].octaves).toBe(3);
});

test("loadProfile restaura la config guardada", () => {
  useKeyboardStore.getState().setOctaves(3);
  useKeyboardStore.getState().saveProfile("P1");
  const id = useKeyboardStore.getState().profiles[0].id;
  useKeyboardStore.getState().setOctaves(1); // cambio posterior
  useKeyboardStore.getState().loadProfile(id);
  expect(useKeyboardStore.getState().octaves).toBe(3);
});

test("deleteProfile quita el perfil", () => {
  useKeyboardStore.getState().saveProfile("P1");
  const id = useKeyboardStore.getState().profiles[0].id;
  useKeyboardStore.getState().deleteProfile(id);
  expect(useKeyboardStore.getState().profiles).toHaveLength(0);
});
