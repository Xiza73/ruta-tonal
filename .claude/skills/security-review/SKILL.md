---
name: security-review
description: >
  Revisión de seguridad para Ruta Tonal (Tauri + React). Auditá permisos de
  capabilities de Tauri, comandos IPC expuestos, acceso a micrófono/filesystem,
  manejo de configuraciones del usuario y dependencias. Trigger: al revisar
  cambios que tocan src-tauri/, permisos, IPC, micrófono o antes de un release.
---

## Cuándo usar

- Cambios en `src-tauri/` (comandos, capabilities, `tauri.conf.json`).
- Cualquier acceso a micrófono, filesystem o red.
- Antes de un build de release.

## Qué revisar

### Tauri / IPC
- **Allowlist mínima:** las capabilities en `tauri.conf.json` exponen solo lo
  necesario. Nada de `all: true`.
- **Comandos IPC:** validan y sanitizan TODA entrada del frontend. El frontend
  no es de confianza.
- **CSP:** Content-Security-Policy configurada; sin `unsafe-eval`.

### Audio / permisos
- Acceso a micrófono pedido explícitamente y manejado el rechazo del usuario.
- El audio del micrófono se procesa local — NO se sube a ningún lado (offline-first).

### Datos del usuario
- Configuraciones guardadas en rutas seguras de la app, no expuestas.
- Sin secretos hardcodeados.

### Dependencias
- Sin deps con vulnerabilidades conocidas (`bun audit` / `cargo audit`).
- Cada dependencia nueva justificada.

## Salida

Por hallazgo: severidad (CRÍTICO / ADVERTENCIA / SUGERENCIA), ubicación, el
riesgo concreto y cómo mitigarlo.
