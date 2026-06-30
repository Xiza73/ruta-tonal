import { fireEvent, render, screen } from "@testing-library/react";
import { DEFAULT_PROFILE, keysForProfile } from "../../lib/keyboard";
import { Keyboard } from "./Keyboard";

const keys = keysForProfile(DEFAULT_PROFILE);
const noop = () => {};

test("renderiza una tecla por nota del perfil (13 en una octava)", () => {
  render(<Keyboard keys={keys} active={new Set()} onPress={noop} onRelease={noop} />);
  expect(screen.getAllByRole("button")).toHaveLength(13);
});

test("pointer down sobre una tecla dispara onPress con su MIDI", () => {
  const onPress = vi.fn();
  render(<Keyboard keys={keys} active={new Set()} onPress={onPress} onRelease={noop} />);
  fireEvent.pointerDown(screen.getByLabelText("C4"));
  expect(onPress).toHaveBeenCalledWith(60);
});

test("la tecla activa queda marcada (aria-pressed)", () => {
  render(<Keyboard keys={keys} active={new Set([60])} onPress={noop} onRelease={noop} />);
  expect(screen.getByLabelText("C4")).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByLabelText("D4")).toHaveAttribute("aria-pressed", "false");
});
