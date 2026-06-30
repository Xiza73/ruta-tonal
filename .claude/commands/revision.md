---
description: Revisión de código del diff actual — correctness e idioms del stack
argument-hint: "[ruta o área opcional, ej. src/audio]"
allowed-tools: Read, Grep, Glob, Bash(git diff:*), Bash(git status)
---

Revisá los cambios actuales (o el área indicada en `$ARGUMENTS`) de Ruta Tonal.

Enfocate en:
- **Correctness:** bugs, edge cases, errores de tipos. Especial atención a la
  lógica de **audio/teoría musical** (frecuencia ↔ nota, notación C/Do).
- **Separación:** lógica de audio pura fuera de los componentes de UI.
- **Idioms del stack:** TypeScript estricto (sin `any`), React 19 (sin
  `useMemo`/`useCallback` manuales), patrón container/presentational.
- **Simplicidad:** código de más, abstracciones especulativas, deps innecesarias.

Por cada hallazgo: ubicación (`archivo:línea`), qué está mal y el porqué técnico,
y la corrección sugerida. No reescribas archivos — reportá.
