import { useState } from "react";
import { useKeyboardStore } from "../../stores/keyboard";
import { configMatchesProfile } from "../../lib/keyboard";
import { cn } from "../../lib/cn";

const controlClass = cn(
  "rounded-md px-3 py-1 text-sm font-medium",
  "focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
);

function SaveProfileDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const trimmed = name.trim();

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div
        role="dialog"
        aria-label="Guardar configuración"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl bg-surface p-5 shadow-raised"
      >
        <h2 className="text-base font-semibold text-fg">Guardar configuración</h2>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && trimmed) onSave(trimmed);
          }}
          placeholder="Nombre del perfil"
          aria-label="Nombre del perfil"
          className="mt-3 w-full rounded-md bg-elevated px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className={cn(controlClass, "bg-elevated text-fg-muted hover:bg-border hover:text-fg")}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!trimmed}
            onClick={() => onSave(trimmed)}
            className={cn(controlClass, "bg-accent text-accent-fg disabled:opacity-40")}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

/** Selector de perfiles guardados + guardar/eliminar. */
export function ProfileControls() {
  const profiles = useKeyboardStore((s) => s.profiles);
  const notation = useKeyboardStore((s) => s.notation);
  const octaves = useKeyboardStore((s) => s.octaves);
  const startMidi = useKeyboardStore((s) => s.startMidi);
  const soundType = useKeyboardStore((s) => s.soundType);
  const customKeyMap = useKeyboardStore((s) => s.customKeyMap);
  const configMode = useKeyboardStore((s) => s.configMode);
  const loadProfile = useKeyboardStore((s) => s.loadProfile);
  const saveProfile = useKeyboardStore((s) => s.saveProfile);
  const deleteProfile = useKeyboardStore((s) => s.deleteProfile);
  const [dialogOpen, setDialogOpen] = useState(false);

  const snapshot = { notation, octaves, startMidi, soundType, customKeyMap };
  const matching = profiles.find((p) => configMatchesProfile(snapshot, p));

  return (
    <div role="group" aria-label="Perfil" className="flex flex-col items-center gap-1">
      <span className="text-xs font-medium text-fg-muted uppercase">Perfil</span>
      <div className="flex items-center gap-1">
        <select
          value={matching?.id ?? ""}
          onChange={(e) => {
            if (e.target.value) loadProfile(e.target.value);
          }}
          aria-label="Perfil guardado"
          className={cn(controlClass, "bg-elevated text-fg")}
        >
          <option value="">Personalizado</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {!configMode && !matching && (
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className={cn(controlClass, "bg-accent text-accent-fg")}
          >
            Guardar
          </button>
        )}

        {matching && (
          <button
            type="button"
            onClick={() => deleteProfile(matching.id)}
            aria-label={`Eliminar perfil ${matching.name}`}
            className={cn(controlClass, "bg-elevated text-fg-muted hover:bg-danger hover:text-accent-fg")}
          >
            ✕
          </button>
        )}
      </div>

      {dialogOpen && (
        <SaveProfileDialog
          onClose={() => setDialogOpen(false)}
          onSave={(name) => {
            saveProfile(name);
            setDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}
