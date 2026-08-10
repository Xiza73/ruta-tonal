//! Transcripción con tiempos por palabra, vía el binario `whisper-cli`.
//!
//! Para qué: LRCLIB da el texto correcto de la letra, pero sus marcas de tiempo
//! son de OTRA grabación. Medido sobre nuestro audio, la deriva entre la primera
//! y la segunda mitad de un tema es de 8.5s, así que ningún offset global la
//! corrige. Los tiempos por palabra de whisper son el ancla que sí corresponde
//! al audio que tenemos; el texto lo pone LRCLIB.
//!
//! whisper-cli va como RESOURCE y no como `externalBin` porque no es un archivo
//! suelto: arrastra las DLLs de ggml. Al resolverlo desde `resource_dir` quedan
//! todas en la misma carpeta y el loader las encuentra sin tocar el PATH.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tauri_plugin_shell::ShellExt;

/// Medido: `base` entra en un bucle degenerado sobre canto — 730 palabras con
/// solo 9 únicas, contra 160 palabras y 57 únicas de la letra real. `small` da
/// 150 y 54, casi clavado. No bajar de acá.
const MODEL_FILE: &str = "ggml-small.bin";
const MODEL_URL: &str =
    "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin";
/// `-dtw` necesita saber a qué modelo corresponden las cabezas de alineamiento.
const DTW_PRESET: &str = "small";

#[derive(Debug, Clone, Serialize)]
pub struct Word {
    pub text: String,
    /// Segundos desde el inicio del audio.
    pub from: f64,
    pub to: f64,
}

/// Forma del JSON de whisper-cli (`-oj`). Los offsets vienen en milisegundos.
#[derive(Deserialize)]
struct CliOutput {
    transcription: Vec<CliSegment>,
}
#[derive(Deserialize)]
struct CliSegment {
    offsets: CliOffsets,
    text: String,
}
#[derive(Deserialize)]
struct CliOffsets {
    from: i64,
    to: i64,
}

/// Ruta del binario dentro de los resources empaquetados.
fn whisper_cli(app: &AppHandle) -> Result<PathBuf, String> {
    let name = if cfg!(windows) { "whisper-cli.exe" } else { "whisper-cli" };
    let path = app
        .path()
        .resource_dir()
        .map_err(|e| format!("No pude resolver los resources: {e}"))?
        .join("resources")
        .join("whisper")
        .join(name);
    if !path.exists() {
        return Err(format!(
            "Falta {}. Corré `bun run sidecar:fetch`.",
            path.display()
        ));
    }
    Ok(path)
}

/// Baja el modelo la primera vez (~465 MB) y lo cachea.
async fn ensure_model(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("No pude resolver el cache: {e}"))?
        .join("models");
    std::fs::create_dir_all(&dir).map_err(|e| format!("No pude crear {}: {e}", dir.display()))?;
    let dest = dir.join(MODEL_FILE);
    if dest.exists() {
        return Ok(dest);
    }

    let bytes = reqwest::get(MODEL_URL)
        .await
        .map_err(|e| format!("No pude bajar el modelo: {e}"))?
        .error_for_status()
        .map_err(|e| format!("El servidor del modelo respondió mal: {e}"))?
        .bytes()
        .await
        .map_err(|e| format!("Se cortó la descarga del modelo: {e}"))?;

    // A un archivo temporal primero: si se corta, no queda un modelo a medias
    // que parezca válido en la próxima corrida.
    let partial = dest.with_extension("part");
    std::fs::write(&partial, &bytes).map_err(|e| format!("No pude escribir el modelo: {e}"))?;
    std::fs::rename(&partial, &dest).map_err(|e| format!("No pude mover el modelo: {e}"))?;
    Ok(dest)
}

/// Convierte la salida del CLI a palabras con tiempos en segundos.
///
/// Puro y testeable: acá se descartan los segmentos vacíos y los de duración
/// cero, que whisper emite entre frases y no corresponden a nada cantado.
pub fn parse_words(json: &str) -> Result<Vec<Word>, String> {
    let parsed: CliOutput =
        serde_json::from_str(json).map_err(|e| format!("JSON de whisper ilegible: {e}"))?;
    Ok(parsed
        .transcription
        .into_iter()
        .filter_map(|segment| {
            let text = segment.text.trim().to_string();
            if text.is_empty() || segment.offsets.to <= segment.offsets.from {
                return None;
            }
            Some(Word {
                text,
                from: segment.offsets.from as f64 / 1000.0,
                to: segment.offsets.to as f64 / 1000.0,
            })
        })
        .collect())
}

/// Transcribe un wav y devuelve las palabras con sus tiempos.
///
/// El wav puede venir a cualquier sample rate: whisper-cli resamplea y hace el
/// downmix a 16 kHz mono por su cuenta (verificado con 44100 estéreo).
#[tauri::command]
pub async fn transcribe_words(app: AppHandle, wav_path: String) -> Result<Vec<Word>, String> {
    let cli = whisper_cli(&app)?;
    let model = ensure_model(&app).await?;

    let out_base = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("No pude resolver el cache: {e}"))?
        .join("whisper-out");

    let output = app
        .shell()
        .command(cli)
        .args([
            "-m",
            &model.to_string_lossy(),
            "-l",
            "es",
            "-ml",
            "1", // un segmento por palabra…
            "-sow", // …cortando por palabra y no por token
            "-dtw",
            DTW_PRESET, // timestamps por DTW, más precisos que la heurística
            "-sns",     // suprime tokens de no-habla: reduce las alucinaciones
            "-oj",
            "-of",
            &out_base.to_string_lossy(),
            &wav_path,
        ])
        .output()
        .await
        .map_err(|e| format!("No pude ejecutar whisper-cli: {e}"))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "whisper-cli falló: {}",
            err.lines().last().unwrap_or("sin detalle")
        ));
    }

    let json_path = out_base.with_extension("json");
    let json = std::fs::read_to_string(&json_path)
        .map_err(|e| format!("No pude leer {}: {e}", json_path.display()))?;
    parse_words(&json)
}

#[cfg(test)]
mod tests {
    use super::parse_words;

    const SALIDA: &str = r#"{"transcription":[
        {"offsets":{"from":1000,"to":1250},"text":" hola"},
        {"offsets":{"from":1250,"to":1600},"text":" mundo"}
    ]}"#;

    #[test]
    fn convierte_milisegundos_a_segundos_y_limpia_el_texto() {
        let words = parse_words(SALIDA).unwrap();
        assert_eq!(words.len(), 2);
        assert_eq!(words[0].text, "hola");
        assert_eq!(words[0].from, 1.0);
        assert_eq!(words[0].to, 1.25);
    }

    #[test]
    fn descarta_los_segmentos_vacios_y_los_de_duracion_cero() {
        let json = r#"{"transcription":[
            {"offsets":{"from":1000,"to":1200},"text":" real"},
            {"offsets":{"from":2000,"to":2000},"text":" duracion cero"},
            {"offsets":{"from":3000,"to":3200},"text":"   "}
        ]}"#;
        let words = parse_words(json).unwrap();
        assert_eq!(words.len(), 1);
        assert_eq!(words[0].text, "real");
    }

    #[test]
    fn devuelve_error_si_el_json_no_tiene_la_forma_esperada() {
        assert!(parse_words("{}").is_err());
        assert!(parse_words("no soy json").is_err());
    }

    #[test]
    fn una_transcripcion_vacia_no_es_error() {
        assert_eq!(parse_words(r#"{"transcription":[]}"#).unwrap().len(), 0);
    }
}
