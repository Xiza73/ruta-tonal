---
name: tauri-v2
description: >
  Build cross-platform desktop & mobile apps with Tauri v2 (Rust core + system WebView): commands, events,
  capabilities/permissions, config, plugins, code signing. v2-correct APIs only (NOT v1).
  Trigger: When working on a Tauri v2 app — IPC, tauri.conf.json, capabilities, plugins, or bundling/signing.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "2.0"
---

## When to Use

- Building a Tauri **v2** desktop or mobile app (Rust backend + web UI)
- Wiring IPC: commands (`invoke`) and events (`emit`/`listen`)
- Editing `tauri.conf.json` or `capabilities/*.json`
- Adding official plugins (fs, dialog, http, shell, notification…)
- Bundling / Windows code signing / release workflows

## v1 → v2 — the breaking changes that bite

Most stale examples online are **v1**. In v2:

| v1 | v2 |
|----|----|
| `import { invoke } from '@tauri-apps/api/tauri'` | `from '@tauri-apps/api/core'` |
| `app.emit_all(...)` / `Manager` for events | `use tauri::Emitter;` → `app.emit(...)` / `emit_to(...)` |
| `allowlist` in config | **capabilities + permissions** (`src-tauri/capabilities/*.json`) |
| config root key `"tauri": {...}` | `"app": {...}` (and `bundle` is **top-level**) |
| `build.distDir` / `build.devPath` | `build.frontendDist` / `build.devUrl` |
| logic in `src-tauri/src/main.rs` | `pub fn run()` in `src-tauri/src/lib.rs` (mobile needs it) |

Run `tauri migrate` to automate most of a v1→v2 upgrade.

## Critical Patterns

### Commands (WebView → Rust, request/response)

```rust
// src-tauri/src/lib.rs
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {name}!")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

```js
import { invoke } from '@tauri-apps/api/core'; // v2: /core (NOT /tauri)
const greeting = await invoke('greet', { name: 'World' });
```

### Events (bidirectional, fire-and-forget)

```rust
use tauri::Emitter;                    // v2: the Emitter trait
app.emit("progress", 50)?;             // to all listeners
app.emit_to("main", "progress", 50)?;  // to one webview label
```

```js
import { listen } from '@tauri-apps/api/event';
const unlisten = await listen('progress', (e) => console.log(e.payload));
```

### Capabilities & permissions (replaces v1 allowlist)

Nothing is allowed by default. Grant per-window in `src-tauri/capabilities/`:

```json
// src-tauri/capabilities/default.json
{
  "identifier": "default",
  "windows": ["main"],
  "permissions": ["core:default", "fs:allow-read-text-file", "dialog:default"]
}
```

### tauri.conf.json (v2 top-level shape)

```json
{
  "productName": "myapp",
  "version": "0.1.0",
  "identifier": "com.example.myapp",
  "build": { "frontendDist": "../dist", "devUrl": "http://localhost:1420" },
  "app": { "windows": [{ "title": "myapp", "width": 800, "height": 600 }] },
  "bundle": { "active": true, "targets": "all" }
}
```

### Windows code signing (under top-level `bundle`, NOT `tauri.bundle`)

```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": "A1B2…",
      "digestAlgorithm": "sha256",
      "timestampUrl": "http://timestamp.comodoca.com",
      "signCommand": "relic sign -c relic.conf -f -o \"%1\""
    }
  }
}
```

### Cargo deps

```toml
[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
```

## Commands

```bash
npm create tauri-app@latest        # scaffold
npm run tauri dev                  # dev
npm run tauri build                # release bundle
npm run tauri build -- --debug     # debug bundle
npm run tauri add fs               # add an official plugin (capability + crate)
npm run tauri android init         # mobile: android
npm run tauri ios init             # mobile: ios
tauri migrate                      # upgrade a v1 project to v2
RUST_BACKTRACE=1 npm run tauri dev # Rust backtraces (PowerShell: $env:RUST_BACKTRACE=1)
```

## Platform Notes

- **Windows**: WebView2 (preinstalled on Win11). Code signing needed for SmartScreen reputation (EV = instant trust, OV builds over time).
- **macOS**: WKWebView. `open_devtools()` is private API — don't ship it (App Store rejects).
- **Linux**: webkitgtk (install separately). Bundles: `.deb`, `.rpm`, `.AppImage`.
- **Mobile**: plugins in Kotlin (Android) / Swift (iOS); requires `lib.rs` entry point.

## Resources

- Config reference: https://v2.tauri.app/reference/config/
- v1→v2 migration: https://v2.tauri.app/start/migrate/from-tauri-1/
- Calling frontend from Rust (Emitter): https://v2.tauri.app/develop/calling-frontend/
