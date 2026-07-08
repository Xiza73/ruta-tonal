import "@testing-library/jest-dom/vitest";

// Radix UI (Select) usa APIs de puntero/scroll que jsdom no implementa.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
}
