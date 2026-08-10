//! Guardar la letra procesada en una carpeta que elige el usuario.
//!
//! El diálogo lo abre RUST, no el WebView: así la carpeta la elige una persona
//! frente a un selector del sistema y no una string que manda el frontend. En
//! los guardados siguientes la ruta sí viaja desde la UI (queda persistida),
//! por eso igual se valida antes de escribir.

use std::path::{Path, PathBuf};
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

/// Valida el nombre de archivo que llega del frontend.
///
/// Un nombre NO navega directorios: sin esto, `../../algo.md` escribiría fuera
/// de la carpeta elegida. La UI ya lo sanitiza, pero eso pasa del otro lado de
/// un límite de confianza.
fn safe_file_name(name: &str) -> Result<&str, String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("El nombre de archivo está vacío".into());
    }
    if name.contains('/') || name.contains('\\') || name.contains("..") {
        return Err("El nombre de archivo no puede contener rutas".into());
    }
    if !name.ends_with(".md") {
        return Err("Solo se exportan archivos .md".into());
    }
    Ok(name)
}

/// Carpeta existente, resuelta.
fn existing_dir(dir: &str) -> Result<PathBuf, String> {
    let path = Path::new(dir)
        .canonicalize()
        .map_err(|_| "La carpeta de destino ya no existe".to_string())?;
    if !path.is_dir() {
        return Err("El destino no es una carpeta".into());
    }
    Ok(path)
}

/// Abre el selector de carpetas. `None` si el usuario cancela.
#[tauri::command]
pub async fn pick_export_dir(app: AppHandle) -> Result<Option<String>, String> {
    // El diálogo bloquea: fuera del runtime async para no clavar un worker.
    let picked = tauri::async_runtime::spawn_blocking(move || {
        app.dialog().file().blocking_pick_folder()
    })
    .await
    .map_err(|e| format!("El selector de carpeta se cayó: {e}"))?;

    Ok(picked.map(|folder| folder.to_string()))
}

/// Escribe la letra y devuelve la ruta final del archivo.
#[tauri::command]
pub async fn save_lyrics(dir: String, file_name: String, contents: String) -> Result<String, String> {
    let folder = existing_dir(&dir)?;
    let name = safe_file_name(&file_name)?;
    let path = folder.join(name);
    std::fs::write(&path, contents).map_err(|e| format!("No pude escribir {}: {e}", path.display()))?;
    Ok(path.to_string_lossy().into_owned())
}

/// Abre la carpeta en el explorador del sistema.
#[tauri::command]
pub async fn open_export_dir(app: AppHandle, dir: String) -> Result<(), String> {
    let folder = existing_dir(&dir)?;
    app.opener()
        .open_path(folder.to_string_lossy(), None::<&str>)
        .map_err(|e| format!("No pude abrir la carpeta: {e}"))
}

#[cfg(test)]
mod tests {
    use super::{existing_dir, safe_file_name};

    #[test]
    fn acepta_un_nombre_normal() {
        assert_eq!(
            safe_file_name("Radiohead - Karma Police.md").unwrap(),
            "Radiohead - Karma Police.md"
        );
    }

    #[test]
    fn rechaza_lo_que_navegaria_directorios() {
        assert!(safe_file_name("../fuera.md").is_err());
        assert!(safe_file_name("sub/dentro.md").is_err());
        assert!(safe_file_name("sub\\dentro.md").is_err());
    }

    #[test]
    fn rechaza_extensiones_que_no_son_md() {
        assert!(safe_file_name("script.ps1").is_err());
        assert!(safe_file_name("sin-extension").is_err());
    }

    #[test]
    fn rechaza_un_nombre_vacio() {
        assert!(safe_file_name("   ").is_err());
    }

    #[test]
    fn rechaza_una_carpeta_que_no_existe() {
        let inexistente = std::env::temp_dir().join("ruta-tonal-no-existe-jamas");
        assert!(existing_dir(&inexistente.to_string_lossy()).is_err());
    }

    #[test]
    fn acepta_una_carpeta_real() {
        let dir = std::env::temp_dir();
        assert!(existing_dir(&dir.to_string_lossy()).is_ok());
    }
}
