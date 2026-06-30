# Hooks (opcional)

Scripts que Claude Code ejecuta automáticamente en eventos del ciclo de vida de
las tools (`PreToolUse`, `PostToolUse`, `Stop`, etc.). Los hooks NO se declaran
acá: se registran en `.claude/settings.json` bajo la clave `"hooks"`. Esta
carpeta es solo para guardar los scripts que esos hooks invocan.

Ejemplo — formatear con Prettier después de cada edición. En `settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "bunx prettier --write \"$CLAUDE_FILE_PATHS\"" }
        ]
      }
    ]
  }
}
```

Ideas útiles para Ruta Tonal:
- `PostToolUse` (Edit|Write) → `bun run lint --fix` sobre los archivos tocados.
- `Stop` → recordatorio de correr `bun run test` antes de commitear.

> Carpeta vacía a propósito. Borrala si no vas a usar hooks.
