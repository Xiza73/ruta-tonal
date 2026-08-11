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
 * No se commitean (~124 MB en total) y se actualizan seguido.
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
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const YT_DLP = "https://github.com/yt-dlp/yt-dlp/releases/latest/download";
const DENO = "https://github.com/denoland/deno/releases/latest/download";
const WHISPER = "https://github.com/ggml-org/whisper.cpp/releases/latest/download";

/** Target de macOS que Tauri compila para las dos arquitecturas. */
const UNIVERSAL = "universal-apple-darwin";
/** Las dos arquitecturas que componen un build universal de macOS. */
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

// El triple DESTINO decide la extension; el SO donde corre el script decide que
// herramienta de descompresion usar. Casi siempre coinciden, pero separarlos
// permite pedir los binarios de otra plataforma para inspeccionarlos.
const isWindows = triple.includes("windows");
const isWindowsHost = process.platform === "win32";
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
  if (isWindowsHost) {
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

/**
 * Triples para los que hay que emitir un binario.
 *
 * Con `universal-apple-darwin` son DOS. Tauri no busca un sidecar universal:
 * compila la app por separado para cada arquitectura, y cada sub-build pide el
 * sidecar CON SU PROPIO TRIPLE (`TAURI_ENV_TARGET_TRIPLE=aarch64-apple-darwin`
 * busca `yt-dlp-aarch64-apple-darwin`). El lipo de la app lo hace Tauri; el de
 * los sidecars no hace falta.
 */
function outputTriples(): string[] {
  return triple === UNIVERSAL ? UNIVERSAL_PARTS : [triple];
}

async function fetchYtDlp(): Promise<void> {
  const targets = outputTriples().map((t) => join(dir, `yt-dlp-${t}${ext}`));
  if (targets.every((t) => existsSync(t)) && !force) return console.log("yt-dlp  ya existe");

  let asset: string;
  if (isWindows) asset = "yt-dlp.exe";
  else if (triple.includes("apple")) asset = "yt-dlp_macos";
  else if (triple.includes("linux")) asset = "yt-dlp_linux";
  else throw new Error(`Plataforma no soportada: ${triple}`);

  console.log(`yt-dlp  bajando ${asset}${targets.length > 1 ? " (para ambas arquitecturas)" : ""}`);
  // yt-dlp_macos ya viene universal, así que el MISMO archivo sirve para las dos
  // arquitecturas: se baja una vez y se copia con los dos nombres.
  await download(`${YT_DLP}/${asset}`, targets[0]);
  for (const extra of targets.slice(1)) copyFileSync(targets[0], extra);
  if (!isWindows) for (const t of targets) chmodSync(t, 0o755);
}

async function fetchDeno(): Promise<void> {
  const targets = outputTriples();
  if (targets.every((t) => existsSync(join(dir, `deno-${t}${ext}`))) && !force) {
    return console.log("deno    ya existe");
  }

  const work = join(tmpdir(), `deno-sidecar-${process.pid}`);
  mkdirSync(work, { recursive: true });
  try {
    for (const target of targets) {
      console.log(`deno    bajando deno-${target}.zip`);
      const dest = join(dir, `deno-${target}${ext}`);
      // copyFileSync y NO renameSync: en el runner el temp del sistema y el
      // repo están en discos distintos (C: y D:) y renombrar entre volúmenes
      // falla con EXDEV.
      copyFileSync(await denoBinary(target, work), dest);
      if (!isWindows) chmodSync(dest, 0o755);
    }
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
      // El zip trae media docena de binarios de ejemplo, pero se copian TODAS
      // las bibliotecas y no una lista blanca: filtrar por `ggml*.dll` dejaba
      // afuera whisper.dll, y sin ella el ejecutable ni arranca (exit 127 sin
      // una línea de error). Las de más pesan 3 MB; equivocarse cuesta más.
      const from = join(work, "Release");
      for (const file of readdirSync(from)) {
        if (file === "whisper-cli.exe" || file.endsWith(".dll")) {
          copyFileSync(join(from, file), join(out, file));
        }
      }
    } else if (triple.includes("linux")) {
      const arch = triple.includes("aarch64") ? "arm64" : "x64";
      console.log(`whisper bajando whisper-bin-ubuntu-${arch}.tar.gz`);
      const tar = join(work, "w.tar.gz");
      await download(`${WHISPER}/whisper-bin-ubuntu-${arch}.tar.gz`, tar);
      execFileSync("tar", ["-xzf", tar, "-C", work]);
      // Igual que en Windows: el binario Y sus bibliotecas. Copiar solo el
      // ejecutable lo deja sin libwhisper/libggml y no arranca.
      for (const file of readdirSync(work, { recursive: true, encoding: "utf8" })) {
        const name = file.split(/[\\/]/).pop() ?? "";
        if (name === "whisper-cli" || name.includes(".so")) {
          copyFileSync(join(work, file), join(out, name));
        }
      }
      if (!existsSync(join(out, "whisper-cli"))) throw new Error("El tar.gz no traía whisper-cli");
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
