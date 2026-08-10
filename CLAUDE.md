# Ruta Tonal

Instrucciones del equipo para Claude Code. Específicas de ESTE proyecto.
Las reglas globales (estilo, memoria, commits sin atribución de IA) viven en el
`~/.claude/CLAUDE.md` global y no se repiten acá.

## Contexto del proyecto

**Ruta Tonal** es una **app de escritorio (Tauri + React)** para identificar y
entrenar notas musicales. Tiene dos vistas: **entrenador** y **letras**.

El entrenador son dos secciones que funcionan en paralelo:

- **Inferior — Teclado/piano virtual configurable:** ayuda a identificar notas.
  Configurable en: notación (`C1, C2…` y/o `Do, Re…`), tamaño del teclado, tipo
  de sonido, entre otros.
- **Superior — Identificador de notas por micrófono:** vía Web Audio API detecta
  el pitch de lo que se toca o canta y lo muestra como un **gráfico de afinación
  en el tiempo** (piano roll vertical + traza que scrollea, estilo entrenador de
  canto tipo *Nail the Pitch*).

Las dos secciones son **independientes en principio**, pero queda la puerta
abierta a que el detector reconozca lo que suena en el teclado virtual.

La vista de **letras** toma un link de YouTube y devuelve la letra con la nota
cantada en cada palabra, exportable a Markdown. Es la única parte que necesita
red.

## Usuarios y alcance (MVP)

Músicos, estudiantes y curiosos que quieren identificar/entrenar notas sin
depender de internet.

**MVP — ✅ entregado (v0.2.0):**
1. Teclado virtual que suena y resalta la nota tocada.
2. Configuración del teclado: notación (C/Do), tamaño, tipo de sonido.
3. Detector de pitch por micrófono con **gráfico de afinación en el tiempo**
   (piano roll vertical + traza scrolleando), no solo la nota actual.

Además ya implementado: mapeo de teclas físicas remapeable (**varias teclas por
nota**), perfiles guardados y temas claro/oscuro.

**Módulo de letras — ✅ entregado (en `dev`, sin release todavía):** link de
YouTube → letra con la nota de cada palabra, más exportación a Markdown en una
carpeta elegida por el usuario.

**Fuera del MVP (después):** exportar las letras a PNG, sync entre dispositivos,
librerías de sonidos extra, que el detector vincule lo del teclado, guardado de
configuraciones en la nube.

## Stack y herramientas

| Capa | Tecnología |
|------|-----------|
| Shell de escritorio | Tauri (backend en Rust, `src-tauri/`) |
| Frontend | React 19 + TypeScript |
| Bundler/dev | Vite |
| Audio | Web Audio API (pitch detection + síntesis) en el frontend |
| Separación de voz | `stem-splitter-core` (HTDemucs sobre ONNX Runtime), en Rust |
| Transcripción | `whisper-cli` (whisper.cpp) como binario empaquetado |
| Descarga de audio | `yt-dlp` + `deno` como sidecars |
| Package manager | **bun** |
| Testing | Vitest (unit/integración) + Playwright (E2E) + `cargo test` |

> **Decisión de arquitectura:** la lógica de audio del ENTRENADOR (pitch +
> sonido) vive en el **frontend con Web Audio API**, no en Rust. Más simple y
> suficiente. Si la precisión/latencia no alcanza, reevaluar `cpal`.
>
> El módulo de letras es la excepción y por una razón medida: ONNX y whisper.cpp
> no corren en el WebView.

## Comandos clave

> El proyecto ya está scaffoldeado y estos scripts funcionan. Package manager: bun.

```bash
bun install            # instalar dependencias
bun run sidecar:fetch  # bajar yt-dlp, deno y whisper-cli (OBLIGATORIO)
bun run tauri dev      # dev: app de escritorio con hot reload
bun run dev            # dev: solo frontend en el browser (rápido para UI)
bun run tauri build    # build: bundle de escritorio de release
bun run test           # tests unit/integración (Vitest)
bun run test:e2e       # tests E2E (Playwright)
bun run lint           # ESLint
bun run typecheck      # tsc --noEmit
```

> `sidecar:fetch` va ANTES de cualquier build de Tauri. Los binarios (~123 MB)
> no se commitean; el script baja los de tu plataforma. En macOS compila
> `whisper-cli` desde el fuente porque upstream no publica CLI para macOS, así
> que ahí hace falta `cmake`.

Tests de Rust:

```bash
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

Dos checks pesados están `#[ignore]`-ados porque bajan modelos y tardan minutos.
Se corren con `-- --ignored --nocapture` y `RUTA_TONAL_M4A` apuntando a un m4a.

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
│   │   ├── tuner/        # detector de notas por mic (sección superior)
│   │   └── lyrics/       # pantalla de letras
│   ├── audio/            # Web Audio API: pitch en vivo y offline (lógica pura)
│   ├── lib/              # teoría musical, pipeline de letras, alineado, export
│   ├── stores/           # Zustand (keyboard, tuner, theme, lyrics)
│   └── App.tsx
├── src-tauri/            # Backend Rust (Tauri)
│   └── src/
│       ├── youtube.rs    # sidecar de yt-dlp
│       ├── separation.rs # HTDemucs sobre ONNX
│       ├── whisper.rs    # whisper-cli, tiempos por palabra
│       ├── export.rs     # selector de carpeta + escritura del .md
│       └── proc.rs       # errores legibles de procesos externos
├── scripts/              # descarga de sidecars
├── tests/                # E2E (Playwright)
└── .claude/              # config de Claude Code: skills, agents, commands
```

> Los skills de proceso (`git-flow`, `github-pr`, `delivery-handoff`,
> `tauri-v2`, `vitest`, `web-audio`, `refactoring-ui`) son **globales**, no del
> repo: viven en `Codes/SKILLS/skills` y se exponen vía junction en
> `~/.claude/skills/`. Los específicos de este proyecto (`deploy`,
> `security-review`) sí están en `.claude/skills/`.

## Integraciones externas

**El entrenador es offline-first** y funciona 100% sin red. El módulo de letras
es la excepción, y está aislado del core.

- **YouTube** *(módulo de letras):* vía `yt-dlp`. Baja `bestaudio[ext=m4a]` para
  NO tener que bundlear ffmpeg (~80 MB/plataforma): el m4a lo decodifica
  `decodeAudioData` en el WebView. Necesita `deno` como runtime JS, si no
  YouTube sirve una extracción degradada.
- **LRCLIB** *(módulo de letras):* letra sincronizada, gratis y sin API key.
  Responde con `access-control-allow-origin: *`, así que el cliente vive en el
  frontend con `fetch` puro — cero código de backend.
- **Modelos** *(módulo de letras):* HTDemucs (209 MB) y whisper `small`
  (465 MB) se bajan en el primer uso y quedan cacheados, no van en el instalador.
- **Supabase** *(futuro, opcional):* auth, guardado de configuraciones/progreso
  en la nube, sync entre dispositivos. Hay MCP de Supabase disponible; agregar a
  `.mcp.json` cuando se decida usarlo.
- **Soundfonts/samples** *(futuro, opcional):* más tipos de sonido para el piano
  (ej. `smplr`, Tone.js + soundfont). Descargables/online; el set base va offline.

## Reglas de trabajo con Claude

**Hacé:**
- Entender el concepto de audio/teoría musical ANTES de codear. Acá lo difícil no
  es el CRUD, es el audio en tiempo real.
- Mantener la lógica de audio/teoría pura y testeada, separada de la UI.
- **Medir antes de decidir**, y dejar los números en el código. Buena parte de
  las decisiones del módulo de letras contradicen la intuición: los comentarios
  con mediciones existen para que nadie repita un experimento ya hecho.
- Lanzar procesos externos desde Rust, NUNCA desde el WebView. Validar del lado
  de Rust todo path o URL que cruce ese límite.
- Conventional Commits y flujo de ramas según el skill `git-flow` (default `dev`).
- Correr `lint` + `test` antes de commitear.

**NO hagas:**
- NO meter online en el camino del ENTRENADOR — eso es offline-first. El módulo
  de letras es la única excepción y va aislado.
- NO mover el audio del entrenador a Rust sin una razón medida.
- NO agregar dependencias por una función que resuelven pocas líneas.
- NO buildear automáticamente después de cambios (lo pide el usuario).
- NO reintentar cosas que ya se midieron y fallaron: `xnnpack` en la separación
  (49% más lento), el modelo `base` de whisper (bucle degenerado), el flag
  `-dtw` de whisper-cli (lo desactiva flash attention, y forzarlo rompe la
  segmentación por palabra).
