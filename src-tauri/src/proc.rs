//! Errores legibles cuando falla un proceso externo.
//!
//! Existe porque la primera versión se quedaba con la última línea de stderr y,
//! cuando venía vacío, devolvía "sin detalle" — que no dice nada. El caso real
//! fue whisper-cli saliendo con 127 y CERO salida porque le faltaba una DLL al
//! lado del ejecutable: el mensaje no daba una sola pista.

/// Últimas líneas útiles de un stream, aplanadas en una sola línea.
fn tail(raw: &[u8], lines: usize) -> String {
    let text = String::from_utf8_lossy(raw);
    let useful: Vec<&str> = text
        .lines()
        .map(str::trim)
        .filter(|l| !l.is_empty())
        .collect();
    useful[useful.len().saturating_sub(lines)..].join(" | ")
}

/// Mensaje de error de un proceso que terminó mal.
///
/// Recibe las piezas sueltas y no un `Output` porque hay dos tipos con ese
/// nombre en juego: el de `std::process` y el de `tauri_plugin_shell`.
///
/// Mira stderr y stdout (algunas herramientas informan por stdout) e incluye el
/// código de salida. Si no hay NADA que mostrar, dice qué suele significar en
/// vez de dejar al usuario sin nada.
pub fn describe_failure(program: &str, code: Option<i32>, stdout: &[u8], stderr: &[u8]) -> String {
    let code = match code {
        Some(code) => code.to_string(),
        None => "interrumpido".to_string(),
    };

    let detail = {
        let err = tail(stderr, 3);
        if err.is_empty() {
            tail(stdout, 3)
        } else {
            err
        }
    };

    if detail.is_empty() {
        format!(
            "{program} falló (código {code}) sin escribir nada. \
             Suele ser una biblioteca faltante al lado del ejecutable: \
             probá `bun run sidecar:fetch --force`."
        )
    } else {
        format!("{program} falló (código {code}): {detail}")
    }
}

#[cfg(test)]
mod tests {
    use super::describe_failure;

    #[test]
    fn usa_las_ultimas_lineas_de_stderr() {
        let msg = describe_failure("yt-dlp", Some(1), b"", b"ruido\nque importa");
        assert!(msg.contains("código 1"), "{msg}");
        assert!(msg.contains("que importa"), "{msg}");
    }

    #[test]
    fn cae_a_stdout_cuando_stderr_viene_vacio() {
        let msg = describe_failure("whisper-cli", Some(2), b"el detalle real", b"   \n");
        assert!(msg.contains("el detalle real"), "{msg}");
    }

    #[test]
    fn sin_salida_explica_la_causa_probable_en_vez_de_no_decir_nada() {
        // El caso real: exit 127 porque faltaba whisper.dll.
        let msg = describe_failure("whisper-cli", Some(127), b"", b"");
        assert!(msg.contains("127"), "{msg}");
        assert!(msg.contains("biblioteca faltante"), "{msg}");
        assert!(msg.contains("sidecar:fetch"), "{msg}");
    }

    #[test]
    fn descarta_las_lineas_en_blanco() {
        let msg = describe_failure("x", Some(1), b"", b"\n\n  \nunica\n\n");
        assert!(msg.ends_with("unica"), "{msg}");
    }

    #[test]
    fn contempla_un_proceso_interrumpido_sin_codigo() {
        let msg = describe_failure("x", None, b"", b"algo");
        assert!(msg.contains("interrumpido"), "{msg}");
    }
}
