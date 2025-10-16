# Repository Guidelines

## Project Structure & Module Organization
The Vite/React renderer lives in `src/`, with `src/main.tsx` bootstrapping `src/App.tsx`. Create feature folders under `src/<feature>` and colocate components, hooks, styles, and tests (`ComponentName.tsx`, `ComponentName.css`, `ComponentName.test.tsx`). Shared images or fonts belong in `src/assets/`. The Tauri shell starts from `src-tauri/src/main.rs`, with granular capabilities under `src-tauri/capabilities/` and runtime configuration in `src-tauri/tauri.conf.json`. Place static assets in `public/` and keep project-level tooling in the root (`tsconfig*.json`, `vite.config.ts`, `biome.json`).

## Build, Test, and Development Commands
- `pnpm install` — sync dependencies with `pnpm-lock.yaml`.
- `pnpm dev` — launch the hot-reloading web app.
- `pnpm tauri dev` — run the desktop shell alongside the renderer.
- `pnpm build` — type-check and emit the production bundle.
- `pnpm preview` — serve the built bundle locally.
- `pnpm tauri build` — package the desktop application.
- `cargo fmt && cargo clippy --all-targets && cargo build` within `src-tauri/` — format, lint, and compile the Rust backend.

## Coding Style & Naming Conventions
Use TypeScript/React with 2-space indentation, `camelCase` variables, and `PascalCase` components (`TagList.tsx`). Keep styles next to their components and prefer functional components with hooks. Run `pnpm biome check .` before committing to enforce linting and formatting. Rust code should follow `rustfmt` defaults, using `snake_case` for functions and `PascalCase` for types.

## Testing Guidelines
Write Vitest + React Testing Library specs beside the React module (`ComponentName.test.tsx`). Trigger the suite with `pnpm test` (optionally add `-- --watch` while iterating). Rust modules should include focused unit tests under `src-tauri/src/` and be exercised via `cargo test`. Aim to cover critical UI states and Tauri command paths before submitting changes.

## Commit & Pull Request Guidelines
Follow Conventional Commit prefixes (`feat(tags):`, `fix(tauri):`, `chore(dev):`) to clarify intent. Each PR should include a succinct summary, reproduction or verification steps, linked issues (`Closes #123`), and before/after screenshots for UI updates. Keep changes scoped to a single concern to ease review and avoid unrelated refactors.

## Security & Configuration Tips
Grant the minimum necessary permissions within `src-tauri/capabilities/`—avoid wildcard capability access. Validate and sanitize renderer input before invoking Tauri commands. Store secrets in environment variables or secure Tauri configuration entries; never commit sensitive values to version control.
