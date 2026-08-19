import { useEffect, useRef, useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfigModeButton } from "./piano/ConfigModeButton";
import { KeyboardConfig } from "./piano/KeyboardConfig";
import { SaveProfileButton } from "./piano/ProfileControls";
import { ThemeToggle } from "./ThemeToggle";
import { MicSelect } from "./tuner/MicSelect";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-t border-border pt-4 first:border-0 first:pt-0">
      <h3 className="text-xs font-semibold tracking-wide text-fg-muted uppercase">{title}</h3>
      {children}
    </section>
  );
}

/**
 * Panel de configuración: todo lo que se define una vez y no se toca mientras
 * se practica.
 *
 * En la barra quedan solo los cuatro controles de uso constante. El selector de
 * perfil sigue afuera porque YA es el atajo a estas opciones de teclado: un
 * perfil guarda notación, octavas, octava inicial y tipo de sonido.
 *
 * Usa el `<dialog>` nativo: modal, fondo y cierre con Esc sin sumar una
 * dependencia de diálogo.
 */
export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Configuración"
        onClick={() => setOpen(true)}
        className="text-fg-muted hover:text-fg"
      >
        <Settings />
      </Button>

      <dialog
        ref={ref}
        aria-label="Configuración"
        onClose={() => setOpen(false)}
        className="m-auto w-full max-w-md rounded-xl border border-border bg-surface p-0 text-fg shadow-raised backdrop:bg-black/60"
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            {/* OJO: `text-base` acá NO es un tamaño. El tema define `--base`
                (el fondo casi negro), así que Tailwind genera `text-base` como
                COLOR y pinta el texto del color del fondo. */}
            <h2 className="text-lg font-semibold text-fg">Configuración</h2>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </div>

          <Section title="Micrófono">
            <MicSelect />
          </Section>

          <Section title="Teclado">
            <KeyboardConfig />
            <div className="flex flex-wrap items-center gap-2">
              {/* Configurar teclas necesita el teclado a la vista para poder
                  clickearlo, asi que activarlo cierra el panel. */}
              <ConfigModeButton onEnter={() => setOpen(false)} />
              <SaveProfileButton />
            </div>
          </Section>

          <Section title="Apariencia">
            <ThemeToggle />
          </Section>
        </div>
      </dialog>
    </>
  );
}
