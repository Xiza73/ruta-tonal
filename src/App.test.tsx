import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import App from "./App";

// El piano precarga las muestras al primer gesto, así que cualquier clic sale a
// buscar el soundfont. Acá se prueba el layout de los controles, no el sonido.
vi.mock("./audio/sampler", () => ({
  createSampler: () => ({
    play: () => ({ release: () => {} }),
    setType: () => {},
    resume: async () => {},
    dispose: () => {},
  }),
}));

/**
 * La barra del entrenador se mantiene en CUATRO controles: lo que se toca
 * mientras se practica. El resto vive en el panel de configuración.
 */
test("la barra deja a mano solo los controles de uso constante", () => {
  render(<App />);

  // Navegación entre vistas y el toggle del micrófono, que se usa todo el tiempo.
  expect(screen.getByRole("tab", { name: "entrenador" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Activar micrófono" })).toBeInTheDocument();
  // El selector de perfil: el atajo a las opciones de teclado.
  expect(screen.getByRole("combobox", { name: "Perfil guardado" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Configuración" })).toBeInTheDocument();
});

test("las opciones que se definen una vez no ocupan la barra", () => {
  render(<App />);

  // Estaban sueltas en la barra; ahora se llega a ellas por el panel.
  expect(screen.queryByRole("button", { name: "Anglosajón" })).not.toBeInTheDocument();
  expect(screen.queryByRole("combobox", { name: "Tipo de sonido" })).not.toBeInTheDocument();
  expect(screen.queryByRole("combobox", { name: "Micrófono" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Configurar teclas" })).not.toBeInTheDocument();
});

test("el panel de configuración expone lo que se sacó de la barra", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole("button", { name: "Configuración" }));

  expect(screen.getByRole("button", { name: "Anglosajón" })).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Tipo de sonido" })).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Micrófono" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Configurar teclas" })).toBeInTheDocument();
});

test("los desplegables del panel se abren dentro del modal y no detrás", async () => {
  // Un <dialog> abierto con showModal vive en el TOP LAYER. Radix portea el
  // desplegable a document.body por default, y desde ahí NADA puede taparlo:
  // el z-index no compite contra el top layer. Quedaba dibujado detrás.
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole("button", { name: "Configuración" }));
  await user.click(screen.getByRole("combobox", { name: "Tipo de sonido" }));

  const dialog = document.querySelector("dialog")!;
  const option = await screen.findByRole("option", { name: "Triangular" });
  expect(dialog.contains(option)).toBe(true);
});
