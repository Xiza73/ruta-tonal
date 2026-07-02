import { fireEvent, render, screen } from "@testing-library/react";
import { useKeyboardStore } from "../../stores/keyboard";
import { KeyboardConfig } from "./KeyboardConfig";

const reset = () =>
  useKeyboardStore.setState({
    notation: "scientific",
    octaves: 2,
    startMidi: 48,
    soundType: "triangle",
  });

beforeEach(reset);

test("cambiar a Latín pone notación solfege", () => {
  render(<KeyboardConfig />);
  fireEvent.click(screen.getByRole("button", { name: "Latín" }));
  expect(useKeyboardStore.getState().notation).toBe("solfege");
});

test("cambiar las octavas actualiza el store", () => {
  render(<KeyboardConfig />);
  fireEvent.click(screen.getByRole("button", { name: "3" }));
  expect(useKeyboardStore.getState().octaves).toBe(3);
});

test("elegir un sonido en el dropdown actualiza el store", () => {
  render(<KeyboardConfig />);
  fireEvent.change(screen.getByLabelText("Tipo de sonido"), {
    target: { value: "square" },
  });
  expect(useKeyboardStore.getState().soundType).toBe("square");
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
