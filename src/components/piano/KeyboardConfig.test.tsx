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

test("elegir octavas en el dropdown actualiza el store", () => {
  render(<KeyboardConfig />);
  fireEvent.change(screen.getByLabelText("Cantidad de octavas"), {
    target: { value: "3" },
  });
  expect(useKeyboardStore.getState().octaves).toBe(3);
});

test("elegir la octava inicial actualiza el store", () => {
  render(<KeyboardConfig />);
  fireEvent.change(screen.getByLabelText("Octava inicial"), {
    target: { value: "60" },
  });
  expect(useKeyboardStore.getState().startMidi).toBe(60);
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
