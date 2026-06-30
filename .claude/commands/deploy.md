---
description: Pasos de build/release del bundle de escritorio (Tauri + bun)
argument-hint: "[plataforma opcional]"
allowed-tools: Read, Bash(bun install), Bash(bun run:*), Bash(git status), Bash(git log:*)
---

Generá un build de release de Ruta Tonal (app de escritorio Tauri).

Pasos:

1. **Gate previo:** `git status` limpio en la rama correcta. Corré `bun run lint`
   y `bun run test` — no se buildea con el gate en rojo.
2. **Dependencias:** `bun install` si cambió `package.json`/lockfile.
3. **Typecheck:** `bun run typecheck`.
4. **Build:** `bun run tauri build`. Genera el bundle en `src-tauri/target/release/`.
5. **Verificar:** confirmá que el artefacto se generó. Reportá la ruta y el tamaño.

Notas:
- El build de Tauri necesita el toolchain de Rust instalado.
- Para release de versión: seguí el skill `git-flow` (PR `dev` → `master`, tag semver).
- NO publiques ni subas binarios sin que el usuario lo pida explícitamente.
