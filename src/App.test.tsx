import { render, screen } from "@testing-library/react";
import App from "./App";

test("renderiza los controles principales", () => {
  render(<App />);
  expect(
    screen.getByRole("button", { name: "Activar micrófono" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Anglosajón" })).toBeInTheDocument();
});
