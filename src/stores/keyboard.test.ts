import { useKeyboardStore } from "./keyboard";

const reset = () =>
  useKeyboardStore.setState({
    notation: "scientific",
    octaves: 2,
    startMidi: 48,
    soundType: "triangle",
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
