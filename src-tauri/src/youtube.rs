//! Descarga del audio de un video de YouTube vía el sidecar `yt-dlp`.
//!
//! El sidecar lo lanza Rust, NO el WebView: exponer `shell:allow-execute` en las
//! capabilities le daría a cualquier XSS la posibilidad de ejecutar procesos
//! arbitrarios. Acá el frontend solo ve `download_audio`, que valida y acota.

use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tauri_plugin_shell::ShellExt;
use url::{Host, Url};

/// Hosts aceptados. Se compara el host YA PARSEADO, nunca con `starts_with`
/// sobre la string cruda: `https://youtube.com.atacante.tld/x` la pasaría.
const ALLOWED_HOSTS: [&str; 5] = [
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be",
    "music.youtube.com",
];

/// Valida que sea una URL de YouTube sobre HTTPS.
///
/// Además de la lista de hosts, esto evita que un argumento que empieza con `-`
/// llegue a yt-dlp y sea interpretado como flag en vez de como URL.
pub fn validate_youtube_url(raw: &str) -> Result<Url, String> {
    let url = Url::parse(raw).map_err(|_| "La URL no es válida".to_string())?;
    if url.scheme() != "https" {
        return Err("Solo se aceptan URLs https".into());
    }
    match url.host() {
        Some(Host::Domain(host)) if ALLOWED_HOSTS.contains(&host) => Ok(url),
        _ => Err("La URL no es de YouTube".into()),
    }
}

/// Ruta de un sidecar, con la misma regla que usa `shell().sidecar()`: los
/// binarios de `externalBin` se instalan al lado del ejecutable de la app.
///
/// Hace falta resolverla a mano porque el plugin sabe LANZAR un sidecar pero no
/// expone su ruta, y a deno no lo lanzamos nosotros: se la pasamos a yt-dlp.
fn sidecar_path(name: &str) -> Result<PathBuf, String> {
    let exe = tauri::utils::platform::current_exe()
        .map_err(|e| format!("No pude resolver el ejecutable actual: {e}"))?;
    let dir = exe
        .parent()
        .ok_or_else(|| "El ejecutable no tiene directorio padre".to_string())?;
    let file = if cfg!(windows) {
        format!("{name}.exe")
    } else {
        name.to_string()
    };
    Ok(dir.join(file))
}

/// Baja el audio del video y devuelve la ruta del archivo local.
///
/// `bestaudio[ext=m4a]` a propósito: el m4a lo decodifica `decodeAudioData` en
/// el WebView, así que no hace falta bundlear ffmpeg (~80 MB por plataforma).
/// El fallback a `bestaudio` cubre los videos sin m4a disponible.
#[tauri::command]
pub async fn download_audio(app: AppHandle, url: String) -> Result<String, String> {
    let url = validate_youtube_url(&url)?;

    let dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("No pude resolver el cache de la app: {e}"))?
        .join("youtube");
    std::fs::create_dir_all(&dir).map_err(|e| format!("No pude crear {}: {e}", dir.display()))?;

    // YouTube dejó de servir la extracción completa sin un runtime JS. Sin esto
    // yt-dlp avisa "some formats may be missing" y puede fallar en algunos videos.
    let deno = sidecar_path("deno")?;

    let output = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| format!("No encuentro el sidecar yt-dlp: {e}"))?
        .args([
            "--no-playlist", // una URL de watch?list= bajaría la playlist entera
            "--no-simulate", // sin esto, --print no descarga
            "--print",
            "after_move:filepath", // que yt-dlp nos diga la ruta final, no adivinarla
            "--js-runtimes",
            &format!("deno:{}", deno.display()),
            "-f",
            "bestaudio[ext=m4a]/bestaudio",
            "-o",
            &dir.join("%(id)s.%(ext)s").to_string_lossy(),
            url.as_str(),
        ])
        .output()
        .await
        .map_err(|e| format!("Falló la ejecución de yt-dlp: {e}"))?;

    if !output.status.success() {
        return Err(crate::proc::describe_failure(
            "yt-dlp",
            output.status.code(),
            &output.stdout,
            &output.stderr,
        ));
    }

    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if path.is_empty() {
        return Err("yt-dlp no devolvió la ruta del archivo".into());
    }
    Ok(path)
}

#[cfg(test)]
mod tests {
    use super::validate_youtube_url;

    #[test]
    fn acepta_las_formas_normales_de_youtube() {
        for url in [
            "https://www.youtube.com/watch?v=wLYk_qRjP6c",
            "https://youtu.be/wLYk_qRjP6c",
            "https://m.youtube.com/watch?v=wLYk_qRjP6c",
            "https://music.youtube.com/watch?v=wLYk_qRjP6c",
        ] {
            assert!(validate_youtube_url(url).is_ok(), "deberia aceptar {url}");
        }
    }

    #[test]
    fn rechaza_host_que_solo_empieza_igual() {
        // El caso que rompe un `starts_with` ingenuo.
        assert!(validate_youtube_url("https://youtube.com.atacante.tld/watch?v=x").is_err());
        assert!(validate_youtube_url("https://noyoutube.com/watch?v=x").is_err());
    }

    #[test]
    fn rechaza_esquemas_que_no_son_https() {
        assert!(validate_youtube_url("http://youtube.com/watch?v=x").is_err());
        assert!(validate_youtube_url("file:///etc/passwd").is_err());
        assert!(validate_youtube_url("javascript:alert(1)").is_err());
    }

    #[test]
    fn rechaza_algo_que_yt_dlp_leeria_como_flag() {
        assert!(validate_youtube_url("--version").is_err());
        assert!(validate_youtube_url("-o/tmp/pwned").is_err());
    }
}
