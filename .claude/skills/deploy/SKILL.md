---
name: deploy
description: >
  Build y release del bundle de escritorio de Ruta Tonal (Tauri + bun). Cubre
  gate de checks, build multiplataforma y tagging de versión. Trigger: al
  preparar un release, generar instaladores o cortar una versión.
---

## Cuándo usar

- Generar un instalador/bundle de escritorio.
- Cortar una versión de release.

## Pasos

1. **Gate:** rama correcta, working tree limpio. `bun run lint` + `bun run test`
   en verde. No se buildea con el gate en rojo.
2. **Deps:** `bun install` si cambió el lockfile.
3. **Typecheck:** `bun run typecheck`.
4. **Build:** `bun run tauri build` → bundle en `src-tauri/target/release/`.
5. **Verificar:** el artefacto existe; reportar ruta y tamaño.

## Release de versión

Seguí el skill `git-flow`:
1. PR `dev` → `master`, merge.
2. `git tag -a vX.Y.Z -m "release: vX.Y.Z"` (semver).
3. `git push origin vX.Y.Z`.

## Notas

- Requiere toolchain de Rust instalado para el build de Tauri.
- Builds por plataforma: correr en cada SO objetivo (Win/macOS/Linux) o CI.
- NO publicar binarios sin pedido explícito del usuario.
