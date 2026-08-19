import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTunerStore } from "../../stores/tuner";

/** Valor del Select para "el que elija el sistema" ('' no le sirve a Radix). */
const SYSTEM = "__system__";

/** Elegir qué micrófono usa el detector. */
export function MicSelect() {
  const devices = useTunerStore((s) => s.devices);
  const deviceId = useTunerStore((s) => s.deviceId);
  const refreshDevices = useTunerStore((s) => s.refreshDevices);
  const selectDevice = useTunerStore((s) => s.selectDevice);

  useEffect(() => {
    void refreshDevices();
    // Enchufar o desenchufar un micrófono cambia la lista: sin esto queda un
    // dispositivo fantasma seleccionable.
    if (!navigator.mediaDevices?.addEventListener) return;
    const onChange = () => void refreshDevices();
    navigator.mediaDevices.addEventListener("devicechange", onChange);
    return () => navigator.mediaDevices.removeEventListener("devicechange", onChange);
  }, [refreshDevices]);

  return (
    <Select
      // OR y no nullish: un deviceId guardado como cadena vacía —lo que dejaba
      // el placeholder de "sin permiso"— tiene que caer en "el del sistema" y
      // no dejar el selector en blanco.
      value={deviceId || SYSTEM}
      onValueChange={(value) => void selectDevice(value === SYSTEM ? null : value)}
    >
      {/* w-full + min-w-0: un nombre largo desbordaba el panel y le metia scroll horizontal. */}
      <SelectTrigger aria-label="Micrófono" className="w-full min-w-0">
        <SelectValue className="truncate" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={SYSTEM}>Micrófono del sistema</SelectItem>
        {devices.map((device) => (
          <SelectItem key={device.deviceId} value={device.deviceId}>
            {device.label}
          </SelectItem>
        ))}
        {/* El browser no revela los dispositivos hasta que se concede el
            permiso. Sin este aviso, la lista vacía parece un error. */}
        {devices.length === 0 && (
          <SelectItem value="__hint__" disabled>
            Activá el micrófono para ver la lista
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
