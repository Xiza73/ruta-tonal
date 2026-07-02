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

test("cambiar la notación actualiza el store", () => {
  render(<KeyboardConfig />);
  fireEvent.click(screen.getByRole("button", { name: "Do, Re, Mi" }));
  expect(useKeyboardStore.getState().notation).toBe("solfege");
});

test("cambiar las octavas actualiza el store", () => {
  render(<KeyboardConfig />);
  fireEvent.click(screen.getByRole("button", { name: "3" }));
  expect(useKeyboardStore.getState().octaves).toBe(3);
});

test("cambiar el sonido actualiza el store", () => {
  render(<KeyboardConfig />);
  fireEvent.click(screen.getByRole("button", { name: "Cuadrada" }));
  expect(useKeyboardStore.getState().soundType).toBe("square");
});

test("la opción activa queda marcada (aria-pressed)", () => {
  render(<KeyboardConfig />);
  expect(screen.getByRole("button", { name: "C, D, E" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
