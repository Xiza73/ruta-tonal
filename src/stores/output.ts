import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setOutputDevice, setOutputVolume } from "../audio/context";
import { listSpeakers, type Microphone } from "../audio/devices";

interface OutputState {
  /** Salidas conectadas. Se llena con `refreshDevices`. */
  devices: Microphone[];
  /** Salida elegida, persistida. `null` = la que elija el sistema. */
  deviceId: string | null;
  /** Volumen maestro, 0–1, persistido. */
  volume: number;
  refreshDevices: () => Promise<void>;
  selectDevice: (deviceId: string | null) => Promise<void>;
  setVolume: (volume: number) => void;
}

export const useOutputStore = create<OutputState>()(
  persist(
    (set) => ({
      devices: [],
      deviceId: null,
      volume: 1,

      refreshDevices: async () => {
        try {
          set({ devices: await listSpeakers() });
        } catch {
          set({ devices: [] });
        }
      },

      selectDevice: async (deviceId) => {
        set({ deviceId });
        await setOutputDevice(deviceId ?? "");
      },

      setVolume: (volume) => {
        set({ volume });
        setOutputVolume(volume);
      },
    }),
    {
      name: "ruta-tonal-output",
      partialize: (state) => ({ deviceId: state.deviceId, volume: state.volume }),
      // Lo guardado se fija en el audio antes de que exista el contexto; se
      // aplica cuando se crea.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        setOutputVolume(state.volume);
        void setOutputDevice(state.deviceId ?? "");
      },
    },
  ),
);
