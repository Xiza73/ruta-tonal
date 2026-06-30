import { render, screen } from "@testing-library/react";
import { Tuner } from "./Tuner";

test("muestra el botón de activar y el estado inicial apagado", () => {
  render(<Tuner />);
  expect(
    screen.getByRole("button", { name: "Activar micrófono" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Micrófono apagado")).toBeInTheDocument();
});
