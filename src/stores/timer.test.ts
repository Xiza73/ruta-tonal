import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTimerStore } from "./timer";

/** Reloj controlado: `performance.now()` es la referencia del temporizador. */
function setNow(ms: number) {
  vi.spyOn(performance, "now").mockReturnValue(ms);
}

beforeEach(() => {
  vi.restoreAllMocks();
  setNow(0);
  useTimerStore.setState({ duration: 300, endsAt: null, pausedAt: null, finished: false });
});

describe("start", () => {
  it("guarda un INSTANTE de fin, no los segundos restantes", () => {
    // Guardar el instante es lo que permite calcular contra el reloj y no
    // acumular ticks, que es de donde sale la deriva.
    setNow(1000);
    useTimerStore.getState().start();
    expect(useTimerStore.getState().endsAt).toBe(1000 + 300 * 1000);
  });

  it("no arranca con duración cero", () => {
    useTimerStore.setState({ duration: 0 });
    useTimerStore.getState().start();
    expect(useTimerStore.getState().endsAt).toBeNull();
  });

  it("reanuda desde lo que quedaba, no desde el total", () => {
    useTimerStore.setState({ pausedAt: 42 });
    setNow(5000);
    useTimerStore.getState().start();
    expect(useTimerStore.getState().endsAt).toBe(5000 + 42 * 1000);
    expect(useTimerStore.getState().pausedAt).toBeNull();
  });
});

describe("pause", () => {
  it("guarda lo que faltaba y suelta el instante de fin", () => {
    setNow(0);
    useTimerStore.getState().start(); // termina en 300000
    setNow(120_000); // pasaron 2 minutos
    useTimerStore.getState().pause();

    expect(useTimerStore.getState().pausedAt).toBe(180);
    expect(useTimerStore.getState().endsAt).toBeNull();
  });

  it("no hace nada si no estaba corriendo", () => {
    useTimerStore.getState().pause();
    expect(useTimerStore.getState().pausedAt).toBeNull();
  });
});

describe("setDuration", () => {
  it("cambiar la duración con el reloj corriendo lo reinicia", () => {
    // Seguir contra un fin viejo mostraría un número que ya no corresponde
    // a la duración que se acaba de elegir.
    useTimerStore.getState().start();
    useTimerStore.getState().setDuration(60);

    expect(useTimerStore.getState().duration).toBe(60);
    expect(useTimerStore.getState().endsAt).toBeNull();
    expect(useTimerStore.getState().pausedAt).toBeNull();
  });

  it("recorta al rango válido", () => {
    useTimerStore.getState().setDuration(-5);
    expect(useTimerStore.getState().duration).toBe(0);
  });
});

describe("reset y finish", () => {
  it("reset deja todo en cero sin tocar la duración elegida", () => {
    useTimerStore.getState().start();
    useTimerStore.getState().reset();
    const state = useTimerStore.getState();
    expect(state.endsAt).toBeNull();
    expect(state.pausedAt).toBeNull();
    expect(state.finished).toBe(false);
    expect(state.duration).toBe(300);
  });

  it("finish marca el fin y detiene la cuenta", () => {
    useTimerStore.getState().start();
    useTimerStore.getState().finish();
    expect(useTimerStore.getState().finished).toBe(true);
    expect(useTimerStore.getState().endsAt).toBeNull();
  });

  it("arrancar después de terminar limpia la marca", () => {
    useTimerStore.getState().finish();
    useTimerStore.getState().start();
    expect(useTimerStore.getState().finished).toBe(false);
  });
});
