import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "../stores/theme";
import { Button } from "@/components/ui/button";

/** Botón para alternar tema claro/oscuro. */
export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);

  return (
    <Button
      variant="secondary"
      size="icon"
      aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      onClick={toggle}
    >
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
