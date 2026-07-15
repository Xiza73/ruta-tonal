import { fireEvent, render, screen } from "@testing-library/react";
import { useKeyboardStore } from "../../stores/keyboard";
import { KeyboardConfig } from "./KeyboardConfig";

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

// Los selects (octavas/inicio/sonido) usan Radix; su lógica de setters se
// prueba en stores/keyboard.test. Acá cubrimos los toggles de notación (botones).
test("cambiar a Latín pone notación solfege", () => {
  render(<KeyboardConfig />);
  fireEvent.click(screen.getByRole("button", { name: "Latín" }));
  expect(useKeyboardStore.getState().notation).toBe("solfege");
});

test("la notación activa queda marcada (aria-pressed)", () => {
  render(<KeyboardConfig />);
  expect(screen.getByRole("button", { name: "Anglosajón" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: "Latín" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});
