import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

function applyInitialColorMode() {
  if (typeof window === "undefined") return;

  const root = window.document.documentElement;
  const storedTheme = window.localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const useDark = storedTheme === "dark" || (!storedTheme && prefersDark);

  root.classList.toggle("dark", useDark);
}

applyInitialColorMode();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
