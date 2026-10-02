import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clampTotal, remainingSeconds } from "../lib/timer";

/**
 * Estado del temporizador.
 *
 * Sigue corriendo con el modal cerrado: un temporizador que se cancela al
 * cerrar la ventana no sirve para practicar. El botón de la barra muestra lo
 * que falta mientras corre.
 *
 * Corriendo se guarda `endsAt` (un instante) y NO los segundos restantes: así
 * la cuenta sale del reloj en cada frame y no acumula error. Pausado se guarda
 * el remanente, porque ahí no hay instante de fin.
 */
interface TimerState {
  /** Duración configurada, en segundos. */
  duration: number;
  /** Instante de fin según `performance.now()`, o `null` si no está corriendo. */
  endsAt: number | null;
  /** Lo que quedaba al pausar. `null` si nunca se arrancó o si terminó. */
  pausedAt: number | null;
  /** Llegó a cero y todavía no se reconoció. */
  finished: boolean;

  setDuration: (seconds: number) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  /** Marca el fin. Lo llama el componente cuando la cuenta llega a cero. */
  finish: () => void;
}

const DEFAULT_DURATION = 5 * 60;

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      duration: DEFAULT_DURATION,
      endsAt: null,
      pausedAt: null,
      finished: false,

      setDuration: (seconds) => {
        // Cambiar la duración con el reloj corriendo lo reinicia: seguir contra
        // un fin viejo mostraría un número que ya no corresponde a nada.
        set({ duration: clampTotal(seconds), endsAt: null, pausedAt: null, finished: false });
      },

      start: () => {
        const { duration, pausedAt } = get();
        const seconds = pausedAt ?? duration;
        if (seconds <= 0) return;
        set({
          endsAt: performance.now() + seconds * 1000,
          pausedAt: null,
          finished: false,
        });
      },

      pause: () => {
        const { endsAt } = get();
        if (endsAt === null) return;
        set({ pausedAt: remainingSeconds(endsAt, performance.now()), endsAt: null });
      },

      reset: () => set({ endsAt: null, pausedAt: null, finished: false }),

      finish: () => set({ endsAt: null, pausedAt: null, finished: true }),
    }),
    {
      name: "ruta-tonal-timer",
      // Solo la duración elegida sobrevive al cierre. Un `endsAt` guardado
      // sería de una sesión anterior: `performance.now()` arranca de cero en
      // cada carga, así que ese instante no significa nada después.
      partialize: (state) => ({ duration: state.duration }),
    },
  ),
);
