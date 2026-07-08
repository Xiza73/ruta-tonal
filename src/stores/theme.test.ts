import { useThemeStore } from "./theme";

test("toggle alterna entre oscuro y claro", () => {
  useThemeStore.setState({ theme: "dark" });
  useThemeStore.getState().toggle();
  expect(useThemeStore.getState().theme).toBe("light");
  useThemeStore.getState().toggle();
  expect(useThemeStore.getState().theme).toBe("dark");
});
