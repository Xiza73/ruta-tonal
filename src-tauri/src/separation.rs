//! Separación de la voz del acompañamiento, con HTDemucs sobre ONNX Runtime.
//!
//! Por qué existe: medido sobre música real, correr detección de pitch sobre la
//! mezcla devuelve la línea de bajo, no la voz (mediana MIDI 39 contra 61 de la
//! voz aislada). Sin este paso el módulo de letras no tiene de dónde sacar la
//! nota de cada palabra.

use std::path::{Path, PathBuf};
use stem_splitter_core::{split_file, SplitOptions};
use tauri::{AppHandle, Manager};

/// Modelo soportado por el crate: HTDemucs (Demucs v4 de Meta) exportado a ONNX.
/// Se baja solo la primera vez (~209 MB) y queda cacheado.
const MODEL: &str = "htdemucs_ort_v1";

/// Verifica que `candidate` esté dentro de `base`, resolviendo symlinks y `..`.
///
/// El path viene del WebView: sin esto, la UI podría pedir separar cualquier
/// archivo del disco y escribir los stems donde quisiera.
fn ensure_inside(base: &Path, candidate: &Path) -> Result<PathBuf, String> {
    let base = base
        .canonicalize()
        .map_err(|e| format!("No pude resolver {}: {e}", base.display()))?;
    let real = candidate
        .canonicalize()
        .map_err(|_| "El archivo no existe".to_string())?;
    if !real.starts_with(&base) {
        return Err("El archivo está fuera del directorio de trabajo".into());
    }
    Ok(real)
}

/// Separa la voz del resto y devuelve la ruta del stem de voz.
///
/// Tarda minutos: es un job, no algo interactivo. La medición fue 2m40s para una
/// canción de 4 minutos en CPU (~0.67× realtime).
#[tauri::command]
pub async fn separate_vocals(app: AppHandle, path: String) -> Result<String, String> {
    let cache = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("No pude resolver el cache de la app: {e}"))?;
    std::fs::create_dir_all(&cache).map_err(|e| format!("No pude crear el cache: {e}"))?;

    let input = ensure_inside(&cache, Path::new(&path))?;
    let out_dir = cache.join("stems");
    std::fs::create_dir_all(&out_dir).map_err(|e| format!("No pude crear stems/: {e}"))?;

    let opts = SplitOptions {
        output_dir: out_dir.to_string_lossy().into_owned(),
        model_name: MODEL.to_string(),
        manifest_url_override: None,
    };

    // split_file es BLOQUEANTE y tarda minutos: fuera del runtime async o le
    // clavamos un worker de tokio todo ese tiempo.
    let result =
        tauri::async_runtime::spawn_blocking(move || split_file(&input.to_string_lossy(), opts))
            .await
            .map_err(|e| format!("La tarea de separación se cayó: {e}"))?
            .map_err(|e| format!("Falló la separación: {e}"))?;

    // ponytail: se descartan drums/bass/other. El crate siempre escribe los
    // cuatro stems, no expone un modo de solo-voz.
    Ok(result.vocals_path)
}

#[cfg(test)]
mod tests {
    use super::ensure_inside;
    use std::fs;
    use std::path::PathBuf;

    /// Crea `<tmp>/<nombre>/` con un `audio.m4a` adentro y devuelve la base.
    fn temp_base(nombre: &str) -> PathBuf {
        let base = std::env::temp_dir().join(nombre);
        let _ = fs::remove_dir_all(&base);
        fs::create_dir_all(base.join("sub")).unwrap();
        fs::write(base.join("audio.m4a"), b"x").unwrap();
        fs::write(base.join("sub").join("hondo.m4a"), b"x").unwrap();
        base
    }

    #[test]
    fn acepta_un_archivo_adentro_de_la_base() {
        let base = temp_base("ruta-tonal-sep-ok");
        assert!(ensure_inside(&base, &base.join("audio.m4a")).is_ok());
        assert!(ensure_inside(&base, &base.join("sub").join("hondo.m4a")).is_ok());
        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn rechaza_lo_que_se_escapa_con_dot_dot() {
        let base = temp_base("ruta-tonal-sep-escape");
        let afuera = std::env::temp_dir().join("ruta-tonal-sep-afuera.m4a");
        fs::write(&afuera, b"x").unwrap();
        // El path existe, pero resuelto queda fuera de la base.
        let colado = base.join("..").join("ruta-tonal-sep-afuera.m4a");
        assert!(ensure_inside(&base, &colado).is_err());
        let _ = fs::remove_file(&afuera);
        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn rechaza_un_archivo_que_no_existe() {
        let base = temp_base("ruta-tonal-sep-inexistente");
        assert!(ensure_inside(&base, &base.join("no-esta.m4a")).is_err());
        let _ = fs::remove_dir_all(&base);
    }

    /// Prueba que la unificación de features de Cargo alcanzó para que el
    /// decodificador de stem-splitter-core lea el m4a de yt-dlp. Es la base de
    /// no bundlear ffmpeg: si esto falla, esa decisión se cae.
    ///
    /// Ignorado por default porque necesita un archivo real:
    ///   cargo test --lib -- --ignored --nocapture
    /// con RUTA_TONAL_M4A apuntando a un .m4a.
    #[test]
    #[ignore = "necesita un m4a real via RUTA_TONAL_M4A"]
    fn decodifica_m4a_gracias_a_la_unificacion_de_features() {
        let path = std::env::var("RUTA_TONAL_M4A")
            .expect("poné RUTA_TONAL_M4A apuntando a un archivo .m4a");
        let audio = stem_splitter_core::core::audio::read_audio(&path)
            .expect("no pudo decodificar el m4a: ¿faltan las features aac/isomp4?");
        println!(
            "decodificado: {} muestras, {} Hz, {} canales",
            audio.samples.len(),
            audio.sample_rate,
            audio.channels
        );
        assert!(audio.samples.len() > 44100, "salieron muy pocas muestras");
        assert_eq!(audio.sample_rate, 44100);
    }

    /// Corre la separación de verdad: baja el modelo (~209 MB la primera vez),
    /// lo ejecuta sobre ONNX Runtime y escribe los stems. Tarda minutos.
    ///
    ///   RUTA_TONAL_M4A=<clip.m4a> cargo test --lib -- --ignored --nocapture
    #[test]
    #[ignore = "baja ~209 MB y tarda minutos"]
    fn separa_de_verdad_y_escribe_el_stem_de_voz() {
        let path = std::env::var("RUTA_TONAL_M4A").expect("poné RUTA_TONAL_M4A");
        let out = std::env::temp_dir().join("ruta-tonal-stems");
        fs::create_dir_all(&out).unwrap();

        let result = super::split_file(
            &path,
            super::SplitOptions {
                output_dir: out.to_string_lossy().into_owned(),
                model_name: super::MODEL.to_string(),
                manifest_url_override: None,
            },
        )
        .expect("falló la separación");

        println!("voz → {}", result.vocals_path);
        let meta = fs::metadata(&result.vocals_path).expect("no se escribió el stem de voz");
        assert!(meta.len() > 1000, "el stem de voz salió vacío");
    }
}
