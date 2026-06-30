import { render, screen } from "@testing-library/react";
import type { DetectedNote } from "../../lib/notes";
import { NoteDisplay } from "./NoteDisplay";

const a4 = (cents: number): DetectedNote => ({
  midi: 69,
  name: "A",
  octave: 4,
  label: "A4",
  frequency: 440,
  cents,
});

test("sin nota y apagado → micrófono apagado", () => {
  render(<NoteDisplay note={null} listening={false} />);
  expect(screen.getByText("Micrófono apagado")).toBeInTheDocument();
});

test("escuchando sin nota → escuchando…", () => {
  render(<NoteDisplay note={null} listening={true} />);
  expect(screen.getByText("Escuchando…")).toBeInTheDocument();
});

test("muestra la nota y los cents (sostenido)", () => {
  render(<NoteDisplay note={a4(16)} listening={true} />);
  expect(screen.getByLabelText("Nota detectada")).toHaveTextContent("A4");
  expect(screen.getByText("+16 cents")).toBeInTheDocument();
});

test("muestra cents negativos (bemol)", () => {
  render(<NoteDisplay note={a4(-12)} listening={true} />);
  expect(screen.getByText("-12 cents")).toBeInTheDocument();
});
