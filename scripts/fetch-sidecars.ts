/**
 * Baja los binarios sidecar a src-tauri/binaries/ con el sufijo de target triple
 * que Tauri espera (`yt-dlp-x86_64-pc-windows-msvc.exe`).
 *
 * - yt-dlp: baja el audio de YouTube.
 * - deno:   runtime JS que yt-dlp necesita para la extracción completa. Sin él
 *           avisa "some formats may be missing" y puede fallar en algunos videos.
 *
 * No se commitean: ~18 MB y ~40 MB, y se actualizan seguido.
 *
 *   bun run sidecar:fetch [--force]
 */
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const YT_DLP = "https://github.com/yt-dlp/yt-dlp/releases/latest/download";
const DENO = "https://github.com/denoland/deno/releases/latest/download";

const triple = execFileSync("rustc", ["-vV"], { encoding: "utf8" })
  .split("\n")
  .find((l) => l.startsWith("host:"))
  ?.slice(5)
  .trim();
if (!triple) throw new Error("No pude leer el target triple de `rustc -vV`. ¿Está Rust instalado?");

const isWindows = triple.includes("windows");
const ext = isWindows ? ".exe" : "";
const dir = join(import.meta.dir, "..", "src-tauri", "binaries");
const force = process.argv.includes("--force");

/** Qué asset de yt-dlp corresponde a cada plataforma. */
function ytDlpAsset(): string {
  if (isWindows) return "yt-dlp.exe";
  if (triple!.includes("apple")) return "yt-dlp_macos"; // universal: intel y arm
  if (triple!.includes("linux")) return "yt-dlp_linux";
  throw new Error(`Plataforma no soportada: ${triple}`);
}

async function download(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falló la descarga de ${url}: ${res.status} ${res.statusText}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

/**
 * Descomprime con la herramienta del sistema en vez de sumar una dependencia:
 * Expand-Archive en Windows, unzip en el resto.
 */
function unzip(zip: string, into: string): void {
  mkdirSync(into, { recursive: true });
  if (isWindows) {
    execFileSync("powershell", [
      "-NoProfile",
      "-Command",
      `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${into}' -Force`,
    ]);
  } else {
    execFileSync("unzip", ["-o", "-q", zip, "-d", into]);
  }
}

async function fetchYtDlp(): Promise<void> {
  const dest = join(dir, `yt-dlp-${triple}${ext}`);
  if (existsSync(dest) && !force) return console.log(`yt-dlp  ya existe`);
  console.log(`yt-dlp  bajando ${ytDlpAsset()}`);
  await download(`${YT_DLP}/${ytDlpAsset()}`, dest);
  if (!isWindows) chmodSync(dest, 0o755);
}

async function fetchDeno(): Promise<void> {
  const dest = join(dir, `deno-${triple}${ext}`);
  if (existsSync(dest) && !force) return console.log(`deno    ya existe`);
  // Los assets de deno usan exactamente los target triples de Rust.
  console.log(`deno    bajando deno-${triple}.zip`);
  const tmp = join(tmpdir(), `deno-${triple}-${process.pid}`);
  const zip = `${tmp}.zip`;
  try {
    await download(`${DENO}/deno-${triple}.zip`, zip);
    unzip(zip, tmp);
    const inner = readdirSync(tmp).find((f) => f === `deno${ext}`);
    if (!inner) throw new Error(`El zip de deno no traía deno${ext}`);
    renameSync(join(tmp, inner), dest);
    if (!isWindows) chmodSync(dest, 0o755);
  } finally {
    rmSync(zip, { force: true });
    rmSync(tmp, { recursive: true, force: true });
  }
}

mkdirSync(dir, { recursive: true });
await fetchYtDlp();
await fetchDeno();
console.log(`listo → ${dir}`);
