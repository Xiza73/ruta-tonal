import { render, screen } from "@testing-library/react";
import { MicButton } from "./MicButton";

test("muestra el botón de micrófono en estado apagado", () => {
  render(<MicButton />);
  expect(
    screen.getByRole("button", { name: "Activar micrófono" }),
  ).toBeInTheDocument();
});
