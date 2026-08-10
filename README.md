# Ruta Tonal

Desktop app (Tauri + React) to **identify and train musical notes**. Three
sections:

- **Virtual piano (bottom):** a configurable keyboard that sounds and highlights
  the note you play. Configurable notation (`C1, C2…` and/or `Do, Re…`), size,
  sound type, and physical key mapping.
- **Pitch tuner (top):** detects the pitch of what you play or sing through the
  microphone and draws it as a **tuning-over-time graph** (vertical piano roll +
  scrolling trace, like a singing trainer).
- **Lyrics:** paste a YouTube link and get the song's lyrics with **the note sung
  on each word**, exportable to Markdown.

The trainer works fully offline. The lyrics module is the only part that needs a
network — see below.

## Features

- 🎹 Playable virtual keyboard (oscillator synth + real piano samples).
- ⚙️ Configurable notation (scientific / solfège), octave count, start octave,
  and sound type.
- ⌨️ Remappable physical keys — **multiple keyboard keys can trigger the same
  note**.
- 🎤 Real-time microphone pitch detection with a tuning-over-time graph.
- 🎵 Lyrics with a note per word, from a YouTube link.
- 📄 Markdown export of processed songs, into a folder you pick.
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
| Vocal separation | `stem-splitter-core` (HTDemucs on ONNX Runtime)  |
| Transcription    | `whisper-cli` (whisper.cpp), bundled binary      |
| Package manager  | bun                                              |
| Testing          | Vitest + Testing Library, Playwright (E2E)       |

## Getting started

Prerequisites:

- [bun](https://bun.sh)
- [Rust toolchain](https://www.rust-lang.org/tools/install) (for the Tauri build)

```bash
bun install            # install dependencies
bun run sidecar:fetch  # download yt-dlp, deno and whisper-cli (see below)
bun run tauri dev      # desktop app with hot reload
bun run dev            # frontend only in the browser (fast for UI work)
bun run tauri build    # release desktop bundle
```

> `sidecar:fetch` is **required before any Tauri build**. The bundled binaries
> (~123 MB) are not committed; the script downloads the right ones for your
> platform. On macOS it compiles `whisper-cli` from source (upstream ships no
> macOS CLI), so `cmake` must be installed there.

## Scripts

```bash
bun run test           # unit / integration tests (Vitest)
bun run test:e2e       # E2E tests (Playwright)
bun run lint           # ESLint
bun run typecheck      # tsc --noEmit
bun run sidecar:fetch  # fetch bundled binaries (--force to re-download)
```

Rust tests live in `src-tauri`:

```bash
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

Two heavy checks are `#[ignore]`d — they download models and take minutes:

```bash
RUTA_TONAL_M4A=<file.m4a> cargo test --manifest-path src-tauri/Cargo.toml --lib -- --ignored --nocapture
```

## The lyrics module

Five stages. The first three take minutes; results are cached per song.

```
YouTube ──yt-dlp──> m4a ──HTDemucs──> isolated vocals
                                          │
                          ┌───────────────┼───────────────┐
                          ▼               ▼               ▼
                    whisper-cli      trackPitch      LRCLIB
                     timings         pitch curve     correct text
                          └───────────────┼───────────────┘
                                          ▼
                            Needleman-Wunsch → note per word
```

**Why each piece exists** — every step below was measured, not assumed:

- **Vocal separation is mandatory.** Running pitch detection on the full mix
  returns the *bass line*, not the voice: median MIDI 39 vs 61 for isolated
  vocals, with 99.7% of readings below A2.
- **Whisper supplies timings, LRCLIB supplies text.** Whisper misses ~1 in 5
  words and hallucinates over instrumental sections; LRCLIB has the correct
  lyrics but its timestamps belong to a *different recording* (8.5 s of drift
  between halves of one song, so no global offset fixes it).
- **Alignment uses Needleman-Wunsch**, not positional pairing: with a 20% word
  error rate, the first mistake would shift everything after it. Words whisper
  missed are interpolated between anchored neighbours.

Typical result on a 4-minute song: ~60% of words anchored to a measured time,
~75% with a note.

**Models** are downloaded on first use and cached (~674 MB total: HTDemucs
209 MB, whisper `small` 465 MB). `small` is the floor — `base` collapses into a
degenerate loop on singing (730 words with only 9 unique ones).

## Project structure

```
src/                   # React frontend
├── components/
│   ├── piano/         # configurable keyboard (bottom section)
│   ├── tuner/         # microphone pitch detector (top section)
│   └── lyrics/        # lyrics screen
├── audio/             # Web Audio: pitch detection + synthesis (pure logic)
├── lib/               # music theory, lyrics pipeline, alignment, export
└── stores/            # Zustand state (keyboard, tuner, theme, lyrics)
src-tauri/             # Rust backend (Tauri shell)
└── src/
    ├── youtube.rs     # yt-dlp sidecar
    ├── separation.rs  # HTDemucs on ONNX
    ├── whisper.rs     # whisper-cli, word timings
    ├── export.rs      # folder picker + Markdown write
    └── proc.rs        # readable errors from external processes
scripts/               # sidecar download
```

## Architecture notes

- **Audio & music theory are pure and testable**, kept out of the UI. Frequency
  ↔ note conversion, the keyboard model, pitch-graph geometry and the whole
  lyrics pipeline live in `src/lib` and `src/audio` with unit tests; components
  only render.
- **Container / presentational**: audio logic lives in containers (e.g.
  `Piano.tsx`), while presentational components (`Keyboard.tsx`, `PianoKey.tsx`)
  just draw.
- **The lyrics pipeline takes its dependencies as parameters**, so the whole
  orchestration is tested without Tauri or the network.
- **Trainer audio lives in the frontend** (Web Audio API), not in Rust. The
  lyrics module is the exception: ONNX and whisper.cpp cannot run in the WebView.
- **External processes are launched from Rust, never from the WebView.**
  Exposing `shell:allow-execute` to the UI would give any XSS arbitrary process
  execution. Paths and URLs crossing that boundary are validated on the Rust
  side.
- **Offline-first where it counts**: the trainer needs no network. The lyrics
  module downloads the video, the models, and the lyrics — and is isolated from
  the core.

## Roadmap

- PNG export of processed lyrics (Markdown ships today).
- Optional extra soundfonts.
- Optional cloud sync of configurations/progress.
