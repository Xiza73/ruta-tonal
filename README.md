# Ruta Tonal

Desktop app (Tauri + React) to **identify and train musical notes** — fully
offline. Two sections work in parallel:

- **Virtual piano (bottom):** a configurable keyboard that sounds and highlights
  the note you play. Configurable notation (`C1, C2…` and/or `Do, Re…`), size,
  sound type, and physical key mapping.
- **Pitch tuner (top):** detects the pitch of what you play or sing through the
  microphone and draws it as a **tuning-over-time graph** (vertical piano roll +
  scrolling trace, like a singing trainer).

Everything runs locally — no account, no internet required.

## Features

- 🎹 Playable virtual keyboard (oscillator synth + real piano samples).
- ⚙️ Configurable notation (scientific / solfège), octave count, start octave,
  and sound type.
- ⌨️ Remappable physical keys — **multiple keyboard keys can trigger the same
  note**.
- 🎤 Real-time microphone pitch detection with a tuning-over-time graph.
- 💾 Saved profiles and dark / light themes, persisted locally.

## Stack

| Layer            | Tech                                             |
| ---------------- | ------------------------------------------------ |
| Desktop shell    | Tauri v2 (Rust core, `src-tauri/`)               |
| Frontend         | React 19 + TypeScript (strict)                   |
| Bundler / dev    | Vite                                             |
| State            | Zustand (persisted to `localStorage`)            |
| Styling          | Tailwind CSS v4 (semantic design tokens)         |
| Audio            | Web Audio API — `pitchy` (detection), `smplr` (samples) |
| Package manager  | bun                                              |
| Testing          | Vitest + Testing Library, Playwright (E2E)       |

## Getting started

Prerequisites:

- [bun](https://bun.sh)
- [Rust toolchain](https://www.rust-lang.org/tools/install) (for the Tauri build)

```bash
bun install            # install dependencies
bun run tauri dev      # desktop app with hot reload
bun run dev            # frontend only in the browser (fast for UI work)
bun run tauri build    # release desktop bundle
```

## Scripts

```bash
bun run test           # unit / integration tests (Vitest)
bun run test:e2e       # E2E tests (Playwright)
bun run lint           # ESLint
bun run typecheck      # tsc --noEmit
```

## Project structure

```
src/                   # React frontend
├── components/
│   ├── piano/         # configurable keyboard (bottom section)
│   └── tuner/         # microphone pitch detector (top section)
├── audio/             # Web Audio: pitch detection + synthesis (pure logic)
├── lib/               # music theory, keyboard model, utils
└── stores/            # Zustand state (keyboard, tuner, theme)
src-tauri/             # Rust backend (Tauri shell)
```

## Architecture notes

- **Audio & music theory are pure and testable**, kept out of the UI. Frequency
  ↔ note conversion, the keyboard model, and pitch-graph geometry live in
  `src/lib` and `src/audio` with unit tests; components only render.
- **Container / presentational**: audio logic lives in containers (e.g.
  `Piano.tsx`), while presentational components (`Keyboard.tsx`, `PianoKey.tsx`)
  just draw.
- **Audio lives in the frontend** (Web Audio API), not in Rust. Simpler and
  enough for now; revisit only if latency/accuracy demands it.
- **Offline-first**: the core works with no network. Any future online feature
  is optional and isolated.

## Roadmap

- Lyrics module: take a YouTube video or mp3, fetch the lyrics, and show the note
  of each syllable/word (online-allowed, isolated from the offline core).
- Optional extra soundfonts.
- Optional cloud sync of configurations/progress.
