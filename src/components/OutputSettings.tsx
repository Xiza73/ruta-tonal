import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { canSelectOutput } from "../audio/context";
import { useOutputStore } from "../stores/output";

/** Valor del Select para "la que elija el sistema" ('' no le sirve a Radix). */
const SYSTEM = "__system__";

/** Salida de audio y volumen maestro del piano. */
export function OutputSettings() {
  const devices = useOutputStore((s) => s.devices);
  const deviceId = useOutputStore((s) => s.deviceId);
  const volume = useOutputStore((s) => s.volume);
  const refreshDevices = useOutputStore((s) => s.refreshDevices);
  const selectDevice = useOutputStore((s) => s.selectDevice);
  const setVolume = useOutputStore((s) => s.setVolume);

  useEffect(() => {
    if (!canSelectOutput) return;
    void refreshDevices();
    if (!navigator.mediaDevices?.addEventListener) return;
    const onChange = () => void refreshDevices();
    navigator.mediaDevices.addEventListener("devicechange", onChange);
    return () => navigator.mediaDevices.removeEventListener("devicechange", onChange);
  }, [refreshDevices]);

  return (
    <div className="flex flex-col gap-3">
      {/* WKWebView (macOS) no tiene setSinkId: ahí suena por la salida del
          sistema y el selector no se muestra. */}
      {canSelectOutput && (
        <Select
          value={deviceId || SYSTEM}
          onValueChange={(value) => void selectDevice(value === SYSTEM ? null : value)}
        >
          <SelectTrigger aria-label="Salida de audio" className="w-full min-w-0">
            <SelectValue className="truncate" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SYSTEM}>Salida del sistema</SelectItem>
            {devices.map((device) => (
              <SelectItem key={device.deviceId} value={device.deviceId}>
                {device.label}
              </SelectItem>
            ))}
            {/* Igual que con el micrófono: el browser oculta los dispositivos
                hasta que se concede el permiso de micrófono. */}
            {devices.length === 0 && (
              <SelectItem value="__hint__" disabled>
                Activa el micrófono para ver la lista
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      )}

      <label className="flex items-center gap-3 text-sm text-fg-muted">
        Volumen
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(e.currentTarget.valueAsNumber)}
          className="flex-1 accent-current"
        />
        <span className="w-10 text-right tabular-nums">{Math.round(volume * 100)}%</span>
      </label>
    </div>
  );
}
