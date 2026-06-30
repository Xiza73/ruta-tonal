import { render, screen } from "@testing-library/react";
import App from "./App";

test("renderiza el título de la app", () => {
  render(<App />);
  expect(
    screen.getByRole("heading", { name: "Ruta Tonal" }),
  ).toBeInTheDocument();
});
