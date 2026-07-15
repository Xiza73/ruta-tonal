import { useState } from "react";
import { Bookmark, X } from "lucide-react";
import { useKeyboardStore } from "../../stores/keyboard";
import { configMatchesProfile } from "../../lib/keyboard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
        className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-raised"
      >
        <h2 className="text-base font-semibold text-foreground">Guardar configuración</h2>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && trimmed) onSave(trimmed);
          }}
          placeholder="Nombre del perfil"
          aria-label="Nombre del perfil"
          className="mt-3 w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" disabled={!trimmed} onClick={() => onSave(trimmed)}>
            Guardar
          </Button>
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
    <div role="group" aria-label="Perfil" className="flex items-center gap-1">
      <Select value={matching?.id ?? ""} onValueChange={loadProfile}>
        <SelectTrigger aria-label="Perfil guardado" className="min-w-40">
          <Bookmark className="opacity-70" />
          <SelectValue placeholder="Personalizado" />
        </SelectTrigger>
        <SelectContent>
          {profiles.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!configMode && !matching && (
        <Button onClick={() => setDialogOpen(true)}>Guardar</Button>
      )}

      {matching && (
        <Button
          variant="ghost"
          size="icon"
          className="text-fg-muted hover:bg-destructive hover:text-destructive-foreground"
          aria-label={`Eliminar perfil ${matching.name}`}
          onClick={() => deleteProfile(matching.id)}
        >
          <X />
        </Button>
      )}

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
