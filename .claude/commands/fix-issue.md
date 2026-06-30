---
description: Workflow para resolver un bug de principio a fin
argument-hint: "<descripción del bug o #issue>"
allowed-tools: Read, Edit, Grep, Glob, Bash(bun run:*), Bash(bun test:*)
---

Resolvé este bug: **$ARGUMENTS**

Seguí este flujo, sin saltarte pasos:

1. **Reproducir:** entendé el comportamiento esperado vs. el real. Si hace falta,
   escribí un test que falle y exponga el bug.
2. **Localizar la causa raíz:** no parchees el síntoma. Encontrá el porqué.
3. **Arreglar:** el cambio mínimo que corrige la causa. Sin refactors de paso.
4. **Verificar:** corré `bun run test` (y `bun run lint`). El test que fallaba
   ahora pasa; nada más se rompe.
5. **Reportar:** causa raíz, qué cambiaste y por qué, y qué tests lo cubren.

Si es de audio, confirmá que la teoría musical (Hz ↔ nota) sigue correcta.
