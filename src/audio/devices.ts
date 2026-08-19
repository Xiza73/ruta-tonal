/**
 * Enumeración de micrófonos disponibles.
 *
 * Dos rarezas del browser que este módulo absorbe:
 *
 * 1. Las etiquetas vienen VACÍAS hasta que el usuario dio permiso de micrófono
 *    al menos una vez. Antes de eso solo hay ids opacos, así que se numeran.
 * 2. Los dispositivos aparecen y desaparecen (un USB que se desenchufa), con lo
 *    cual un id guardado puede dejar de existir entre sesiones.
 */

export interface Microphone {
  deviceId: string;
  label: string;
}

/**
 * Micrófonos conectados. Vacío si el browser no expone la API o si todavía no
 * hay permiso.
 *
 * Se descartan los que vienen con `deviceId` vacío: ANTES de dar permiso el
 * browser devuelve un placeholder por cada tipo de dispositivo, sin id ni
 * etiqueta. Ofrecerlo como opción elegible guarda una cadena vacía y deja el
 * selector roto — mejor lista vacía y solo "el del sistema" hasta que se
 * conceda el permiso.
 */
export async function listMicrophones(): Promise<Microphone[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((device) => device.kind === "audioinput" && device.deviceId !== "")
    .map((device, i) => ({
      deviceId: device.deviceId,
      // Con id válido la etiqueta casi siempre viene; el número es una red.
      label: device.label || `Micrófono ${i + 1}`,
    }));
}

/**
 * Qué `deviceId` usar realmente.
 *
 * Devuelve `undefined` —o sea, "el que elija el sistema"— cuando el preferido
 * ya no está conectado. Sin esto, `getUserMedia` con un id muerto falla y el
 * tuner queda sin andar hasta que alguien adivine que hay que reelegirlo.
 */
export function resolveDeviceId(
  devices: Microphone[],
  preferred: string | null,
): string | undefined {
  if (!preferred) return undefined;
  return devices.some((device) => device.deviceId === preferred) ? preferred : undefined;
}
