# Ruta Tonal

Instrucciones del equipo para Claude Code. Específicas de ESTE proyecto.
Las reglas globales (estilo, memoria, commits sin atribución de IA) viven en el
`~/.claude/CLAUDE.md` global y no se repiten acá.

## Contexto del proyecto

**Ruta Tonal** es una **app de escritorio (Tauri + React)** para identificar y
entrenar notas musicales. Tiene dos secciones que funcionan en paralelo:

- **Inferior — Teclado/piano virtual configurable:** ayuda a identificar notas.
  Configurable en: notación (`C1, C2…` y/o `Do, Re…`), tamaño del teclado, tipo
  de sonido, entre otros.
- **Superior — Identificador de notas por micrófono:** vía Web Audio API detecta
  el pitch de lo que se toca o canta y lo muestra como un **gráfico de afinación
  en el tiempo** (piano roll vertical + traza que scrollea, estilo entrenador de
  canto tipo *Nail the Pitch*).

Las dos secciones son **independientes en principio**, pero queda la puerta
abierta a que el detector reconozca lo que suena en el teclado virtual.

## Usuarios y alcance (MVP)

Músicos, estudiantes y curiosos que quieren identificar/entrenar notas sin
depender de internet.

**MVP (primero esto):**
1. Teclado virtual que suena y resalta la nota tocada.
2. Configuración del teclado: notación (C/Do), tamaño, tipo de sonido.
3. Detector de pitch por micrófono con **gráfico de afinación en el tiempo**
   (piano roll vertical + traza scrolleando), no solo la nota actual.

**Fuera del MVP (después):** sync entre dispositivos, librerías de sonidos
extra, que el detector vincule lo del teclado, guardado de configuraciones en la
nube.

## Stack y herramientas

| Capa | Tecnología |
|------|-----------|
| Shell de escritorio | Tauri (backend en Rust, `src-tauri/`) |
| Frontend | React 19 + TypeScript |
| Bundler/dev | Vite |
| Audio | Web Audio API (pitch detection + síntesis) en el frontend |
| Package manager | **bun** |
| Testing | Vitest (unit/integración) + Playwright (E2E) |

> **Decisión de arquitectura:** la lógica de audio (pitch + sonido) vive en el
> **frontend con Web Audio API**, no en Rust. Más simple y suficiente para el
> MVP. Si la precisión/latencia no alcanza, reevaluar moverla a Rust (`cpal`).

## Comandos clave

> Scripts previstos en `package.json` (el proyecto aún no está scaffolded).
> Confirmar/crear al inicializar Tauri.

```bash
bun install            # instalar dependencias
bun run tauri dev      # dev: app de escritorio con hot reload
bun run dev            # dev: solo frontend en el browser (rápido para UI)
bun run tauri build    # build: bundle de escritorio de release
bun run test           # tests unit/integración (Vitest)
bun run test:e2e       # tests E2E (Playwright)
bun run lint           # ESLint
bun run typecheck      # tsc --noEmit
```

## Convenciones de código

- **TypeScript estricto.** Nada de `any`. Tipos explícitos en los límites.
- **React 19 + React Compiler:** no usar `useMemo`/`useCallback` manuales.
- **Componentes:** patrón container/presentational. Lógica de audio fuera de los
  componentes de UI (en `src/audio/`).
- **Audio:** la teoría musical (frecuencia ↔ nota, notación C/Do) vive en módulos
  puros y testeables, separada de la UI.
- **Estilos:** (definir — Tailwind 4 sugerido para consistencia con los skills).

## Estructura del repositorio

Single-package. Tauri separa el backend Rust en `src-tauri/`.

```
ruta-tonal/
├── src/                  # Frontend React (TS)
│   ├── components/
│   │   ├── piano/        # teclado configurable (sección inferior)
│   │   └── tuner/        # detector de notas por mic (sección superior)
│   ├── audio/            # Web Audio API: pitch detection + síntesis (lógica pura)
│   ├── lib/              # teoría musical, utils
│   └── App.tsx
├── src-tauri/            # Backend Rust (Tauri)
├── tests/                # E2E (Playwright)
├── .claude/              # config de Claude Code (este árbol)
└── skills/               # skills de proceso (git-flow, github-pr, delivery-handoff)
```

## Integraciones externas

App **offline-first**. Las funciones online son **opcionales e independientes**
del core — la app funciona 100% sin red.

- **Supabase** *(futuro, opcional):* auth, guardado de configuraciones/progreso
  en la nube, sync entre dispositivos. NO en el MVP. Hay MCP de Supabase
  disponible; agregar a `.mcp.json` cuando se decida usarlo.
- **Soundfonts/samples** *(futuro, opcional):* más tipos de sonido para el piano
  (ej. `smplr`, Tone.js + soundfont). Descargables/online; el set base va offline.

## Reglas de trabajo con Claude

**Hacé:**
- Entender el concepto de audio/teoría musical ANTES de codear. Acá lo difícil no
  es el CRUD, es el audio en tiempo real.
- Mantener la lógica de audio/teoría pura y testeada, separada de la UI.
- Conventional Commits y flujo de ramas según el skill `git-flow` (default `dev`).
- Correr `lint` + `test` antes de commitear.

**NO hagas:**
- NO meter backend/online en el camino del MVP — es offline-first.
- NO mover audio a Rust sin una razón medida (latencia/precisión).
- NO agregar dependencias por una función que resuelven pocas líneas.
- NO buildear automáticamente después de cambios (lo pide el usuario).
