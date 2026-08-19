import { afterEach, describe, expect, it, vi } from "vitest";
import { listMicrophones, resolveDeviceId, type Microphone } from "./devices";

const devices: Microphone[] = [
  { deviceId: "abc", label: "Webcam" },
  { deviceId: "def", label: "Interfaz USB" },
];

describe("resolveDeviceId", () => {
  it("devuelve el elegido cuando sigue conectado", () => {
    expect(resolveDeviceId(devices, "def")).toBe("def");
  });

  it("cae al del sistema si el elegido ya no está", () => {
    // El caso real: un USB desenchufado entre sesiones. Sin esto, getUserMedia
    // con un id muerto falla y el tuner queda sin andar.
    expect(resolveDeviceId(devices, "se-fue")).toBeUndefined();
  });

  it("sin preferencia usa el del sistema", () => {
    expect(resolveDeviceId(devices, null)).toBeUndefined();
  });

  it("sin dispositivos tampoco inventa uno", () => {
    expect(resolveDeviceId([], "abc")).toBeUndefined();
  });
});

/** Reemplaza navigator.mediaDevices por una lista fija. */
function stubDevices(list: Partial<MediaDeviceInfo>[] | null) {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: list === null ? undefined : { enumerateDevices: vi.fn(async () => list) },
  });
}

afterEach(() => {
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
});

describe("listMicrophones", () => {
  it("descarta los placeholders sin deviceId", async () => {
    // Antes de dar permiso el browser devuelve esto: sin id y sin etiqueta.
    // Ofrecerlo guardaba una cadena vacía y rompía el selector.
    stubDevices([{ kind: "audioinput", deviceId: "", label: "" }]);
    expect(await listMicrophones()).toEqual([]);
  });

  it("deja solo las entradas de audio", async () => {
    stubDevices([
      { kind: "audioinput", deviceId: "mic", label: "Interfaz USB" },
      { kind: "audiooutput", deviceId: "spk", label: "Parlantes" },
      { kind: "videoinput", deviceId: "cam", label: "Webcam" },
    ]);
    expect(await listMicrophones()).toEqual([{ deviceId: "mic", label: "Interfaz USB" }]);
  });

  it("numera el que llegue sin etiqueta pero con id válido", async () => {
    stubDevices([{ kind: "audioinput", deviceId: "abc", label: "" }]);
    expect((await listMicrophones())[0].label).toBe("Micrófono 1");
  });

  it("no explota si el browser no expone la API", async () => {
    stubDevices(null);
    expect(await listMicrophones()).toEqual([]);
  });
});
