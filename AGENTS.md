# Repository Guidelines

## Project Structure & Module Organization
- Frontend app in `src/` (Vite + React + TypeScript). Static assets in `src/assets/`. Entry points: `src/main.tsx`, `src/App.tsx`.
- Desktop (Tauri) code in `src-tauri/` with Rust sources under `src-tauri/src/` (`main.rs`, `lib.rs`). App config in `src-tauri/tauri.conf.json`. Icons in `src-tauri/icons/`.
- Public files for Vite in `public/`. Root config: `vite.config.ts`, `tsconfig*.json`.

## Build, Test, and Development Commands
- Install: `pnpm install`
- Web dev server: `pnpm dev` (Vite on localhost with HMR).
- Desktop dev (Tauri): `pnpm tauri dev` (launches the Tauri shell + Vite).
- Web build: `pnpm build` (runs `tsc` then `vite build`). Preview: `pnpm preview`.
- Desktop build: `pnpm tauri build` (produces platform binaries under `src-tauri/target/`).
- Rust tooling (inside `src-tauri/`): `cargo fmt`, `cargo clippy` (lint), `cargo build`.

## Coding Style & Naming Conventions
- TypeScript/React: 2‑space indent; `camelCase` for variables/functions; `PascalCase` for components and files (e.g., `MyWidget.tsx`); modules live under `src/feature/…` as needed.
- Prefer functional React components and hooks; co-locate component styles in `*.css` next to the component.
- Rust: follow `rustfmt` defaults; `snake_case` for modules/functions, `PascalCase` for types.

## Testing Guidelines
- No formal test setup yet. For frontend, prefer adding Vitest + React Testing Library; name files `*.test.ts(x)` and place beside the unit under test.
- For Rust, use `cargo test` with inline `#[cfg(test)]` modules.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `build:`.
- Keep messages imperative and concise; include scope when helpful, e.g., `feat(app): add tag search`.
- PRs should include: clear description, screenshots/GIFs for UI changes, steps to verify, and any related issues (e.g., `Closes #123`). Keep changes focused.

## Security & Configuration Tips
- Tauri capabilities live under `src-tauri/capabilities/`. Only enable what the app needs; avoid wildcard permissions.
- Never use `eval` or dynamic code execution in the frontend. Validate all inputs before passing to Tauri commands.
- Secrets/config: do not hardcode; use environment variables and Tauri config where appropriate.

