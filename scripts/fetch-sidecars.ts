/**
 * Baja los binarios sidecar a src-tauri/binaries/ con el sufijo de target triple
 * que Tauri espera (`yt-dlp-x86_64-pc-windows-msvc.exe`).
 *
 * - yt-dlp: baja el audio de YouTube.
 * - deno:   runtime JS que yt-dlp necesita para la extracción completa. Sin él
 *           avisa "some formats may be missing" y puede fallar en algunos videos.
 *
 * whisper-cli va aparte, a src-tauri/resources/whisper/: no es un archivo suelto
 * sino un ejecutable con sus DLLs de ggml al lado, y `externalBin` solo maneja
 * binarios sueltos. Como se resuelve por `resource_dir`, las DLLs quedan en la
 * misma carpeta y el linker las encuentra sin tocar el PATH.
 *
 * No se commitean: ~18 MB, ~97 MB y ~8 MB, y se actualizan seguido.
 *
 *   bun run sidecar:fetch                                  # triple del host
 *   bun run sidecar:fetch --triple universal-apple-darwin  # release de macOS
 *   bun run sidecar:fetch --force                          # rebajar si ya existen
 */
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const YT_DLP = "https://github.com/yt-dlp/yt-dlp/releases/latest/download";
const DENO = "https://github.com/denoland/deno/releases/latest/download";
const WHISPER = "https://github.com/ggml-org/whisper.cpp/releases/latest/download";

/** Target de macOS que fusiona ambas arquitecturas. */
const UNIVERSAL = "universal-apple-darwin";
/** Arquitecturas que hay que unir con lipo para armar el universal. */
const UNIVERSAL_PARTS = ["x86_64-apple-darwin", "aarch64-apple-darwin"];

function hostTriple(): string {
  const host = execFileSync("rustc", ["-vV"], { encoding: "utf8" })
    .split("\n")
    .find((l) => l.startsWith("host:"))
    ?.slice(5)
    .trim();
  if (!host) throw new Error("No pude leer el target triple de `rustc -vV`. ¿Está Rust instalado?");
  return host;
}

const argv = process.argv.slice(2);
const flag = argv.indexOf("--triple");
const triple = flag >= 0 ? argv[flag + 1] : hostTriple();
if (!triple) throw new Error("--triple necesita un valor");
const force = argv.includes("--force");

const isWindows = triple.includes("windows");
const ext = isWindows ? ".exe" : "";
const dir = join(import.meta.dir, "..", "src-tauri", "binaries");
/** whisper va como resource (varios archivos), no como externalBin. */
const whisperDir = join(import.meta.dir, "..", "src-tauri", "resources", "whisper");

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

/** Baja el zip de deno de una arquitectura y devuelve la ruta del binario suelto. */
async function denoBinary(archTriple: string, workDir: string): Promise<string> {
  // Los assets de release de deno usan exactamente los target triples de Rust.
  const zip = join(workDir, `${archTriple}.zip`);
  const out = join(workDir, archTriple);
  await download(`${DENO}/deno-${archTriple}.zip`, zip);
  unzip(zip, out);
  const inner = readdirSync(out).find((f) => f === `deno${ext}`);
  if (!inner) throw new Error(`El zip de deno para ${archTriple} no traía deno${ext}`);
  return join(out, inner);
}

async function fetchYtDlp(): Promise<void> {
  const dest = join(dir, `yt-dlp-${triple}${ext}`);
  if (existsSync(dest) && !force) return console.log("yt-dlp  ya existe");

  // yt-dlp_macos ya viene universal (Intel + Apple Silicon), así que sirve
  // tal cual para el target universal-apple-darwin.
  let asset: string;
  if (isWindows) asset = "yt-dlp.exe";
  else if (triple.includes("apple")) asset = "yt-dlp_macos";
  else if (triple.includes("linux")) asset = "yt-dlp_linux";
  else throw new Error(`Plataforma no soportada: ${triple}`);

  console.log(`yt-dlp  bajando ${asset}`);
  await download(`${YT_DLP}/${asset}`, dest);
  if (!isWindows) chmodSync(dest, 0o755);
}

async function fetchDeno(): Promise<void> {
  const dest = join(dir, `deno-${triple}${ext}`);
  if (existsSync(dest) && !force) return console.log("deno    ya existe");

  const work = join(tmpdir(), `deno-sidecar-${process.pid}`);
  mkdirSync(work, { recursive: true });
  try {
    if (triple === UNIVERSAL) {
      // Tauri exige que el sidecar TAMBIEN sea universal cuando el target lo es;
      // no se puede mezclar. deno publica por arquitectura, asi que las unimos.
      console.log(`deno    bajando ${UNIVERSAL_PARTS.join(" + ")} y uniendo con lipo`);
      const parts: string[] = [];
      for (const part of UNIVERSAL_PARTS) parts.push(await denoBinary(part, work));
      execFileSync("lipo", ["-create", "-output", dest, ...parts]);
    } else {
      console.log(`deno    bajando deno-${triple}.zip`);
      renameSync(await denoBinary(triple, work), dest);
    }
    if (!isWindows) chmodSync(dest, 0o755);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

/**
 * whisper-cli + sus DLLs de ggml, a src-tauri/resources/whisper/.
 *
 * Windows y Linux tienen binarios publicados. macOS NO: el release solo trae un
 * xcframework para embeber en apps, así que hay que compilar desde el fuente.
 * Se compila con BUILD_SHARED_LIBS=OFF para que salga un binario estático y no
 * haya dylibs sueltas que acomodar.
 */
async function fetchWhisper(): Promise<void> {
  // Sin subcarpeta por triple: solo se buildea una plataforma por vez, y anidar
  // obligaría a la config de Tauri y al Rust a conocer el triple.
  const out = whisperDir;
  if (existsSync(join(out, `whisper-cli${ext}`)) && !force) return console.log("whisper ya existe");
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  const work = join(tmpdir(), `whisper-sidecar-${process.pid}`);
  mkdirSync(work, { recursive: true });
  try {
    if (isWindows) {
      console.log("whisper bajando whisper-bin-x64.zip");
      const zip = join(work, "w.zip");
      await download(`${WHISPER}/whisper-bin-x64.zip`, zip);
      unzip(zip, work);
      // El zip trae media docena de binarios de ejemplo; solo queremos el CLI y
      // las DLLs de ggml, que se despachan según el CPU en runtime.
      const from = join(work, "Release");
      for (const file of readdirSync(from)) {
        if (file === "whisper-cli.exe" || /^ggml.*\.dll$/.test(file)) {
          copyFileSync(join(from, file), join(out, file));
        }
      }
    } else if (triple.includes("linux")) {
      const arch = triple.includes("aarch64") ? "arm64" : "x64";
      console.log(`whisper bajando whisper-bin-ubuntu-${arch}.tar.gz`);
      const tar = join(work, "w.tar.gz");
      await download(`${WHISPER}/whisper-bin-ubuntu-${arch}.tar.gz`, tar);
      execFileSync("tar", ["-xzf", tar, "-C", work]);
      for (const file of readdirSync(work, { recursive: true, encoding: "utf8" })) {
        if (/(^|[\\/])whisper-cli$/.test(file)) copyFileSync(join(work, file), join(out, "whisper-cli"));
      }
      chmodSync(join(out, "whisper-cli"), 0o755);
    } else if (triple.includes("apple")) {
      // No hay binario publicado para macOS: se compila.
      const arches = triple === UNIVERSAL ? "x86_64;arm64" : triple.includes("aarch64") ? "arm64" : "x86_64";
      console.log(`whisper compilando desde el fuente (${arches}) — necesita cmake`);
      execFileSync("git", ["clone", "--depth", "1", "https://github.com/ggml-org/whisper.cpp", work + "/src"], { stdio: "inherit" });
      execFileSync("cmake", ["-B", `${work}/build`, "-S", `${work}/src`,
        `-DCMAKE_OSX_ARCHITECTURES=${arches}`, "-DBUILD_SHARED_LIBS=OFF", "-DWHISPER_BUILD_TESTS=OFF",
        "-DWHISPER_BUILD_EXAMPLES=ON", "-DCMAKE_BUILD_TYPE=Release"], { stdio: "inherit" });
      execFileSync("cmake", ["--build", `${work}/build`, "--config", "Release", "--target", "whisper-cli"], { stdio: "inherit" });
      const built = readdirSync(`${work}/build/bin`).find((f) => f === "whisper-cli");
      if (!built) throw new Error("cmake no produjo whisper-cli");
      copyFileSync(join(`${work}/build/bin`, built), join(out, "whisper-cli"));
      chmodSync(join(out, "whisper-cli"), 0o755);
    } else {
      throw new Error(`Plataforma no soportada: ${triple}`);
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

console.log(`target triple: ${triple}`);
mkdirSync(dir, { recursive: true });
await fetchYtDlp();
await fetchDeno();
await fetchWhisper();
console.log(`listo → ${dir}\n        ${whisperDir}`);
