"use client";
import { useSyncExternalStore } from "react";

const key = "trustloop.theme";
function subscribe(update: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const sync = () => {
    let preference: string | null = null;
    try {
      preference = localStorage.getItem(key);
    } catch {}
    document.documentElement.dataset.theme =
      preference === "dark" || preference === "light"
        ? preference
        : media.matches
          ? "dark"
          : "light";
    update();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) sync();
  };
  window.addEventListener("trustloop-theme", update);
  window.addEventListener("storage", onStorage);
  media.addEventListener("change", sync);
  return () => {
    window.removeEventListener("trustloop-theme", update);
    window.removeEventListener("storage", onStorage);
    media.removeEventListener("change", sync);
  };
}
export function ThemeToggle() {
  const dark = useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.theme === "dark",
    () => false,
  );
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label="Dark mode"
      aria-pressed={dark}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => {
        const theme = dark ? "light" : "dark";
        document.documentElement.dataset.theme = theme;
        try {
          localStorage.setItem(key, theme);
        } catch {}
        window.dispatchEvent(new Event("trustloop-theme"));
      }}
    >
      <span aria-hidden="true">{dark ? "☀" : "☾"}</span>
      {dark ? "Light mode" : "Dark mode"}
    </button>
  );
}
