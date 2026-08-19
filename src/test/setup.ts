import "@testing-library/jest-dom/vitest";

// Radix UI (Select) usa APIs de puntero/scroll que jsdom no implementa.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
}

// jsdom no implementa Web Audio. El piano precarga las muestras al PRIMER
// gesto del usuario, así que cualquier test que haga clic crea un AudioContext
// y revienta, aunque no esté probando audio.
//
// El stub responde cualquier método con un no-op en vez de enumerar la API:
// acá no se prueba el sonido, solo hace falta que nada explote.
if (typeof globalThis.AudioContext === "undefined") {
  const noop = () => new Proxy({}, handler);
  const handler: ProxyHandler<object> = {
    get: (_target, key) => (key === "then" ? undefined : noop),
  };
  globalThis.AudioContext = function AudioContextStub() {
    return new Proxy({}, handler);
  } as unknown as typeof AudioContext;
}

// jsdom trae <dialog> pero no sus métodos. Alcanza con mover el atributo
// `open`, que es lo que decide si el contenido está en el árbol accesible.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
}
