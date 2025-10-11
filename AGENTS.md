# Repository Guidelines

## Project Structure & Module Organization
The Vite/React front end lives in `src/`, with `src/main.tsx` bootstrapping `src/App.tsx`. Create feature folders under `src/<feature>` and colocate UI, hooks, and tests there. Shared images or fonts belong in `src/assets/`, while component styles should sit next to the component as `ComponentName.css`. Desktop shell code resides in `src-tauri/src/` (entry point `main.rs`), with granular capabilities defined in `src-tauri/capabilities/` and runtime config in `src-tauri/tauri.conf.json`. Static files go in `public/`, and project-level tooling is configured via the root `tsconfig*.json`, `vite.config.ts`, and `biome.json`.

## Build, Test, and Development Commands
Run `pnpm install` after cloning to sync dependencies with `pnpm-lock.yaml`. Use `pnpm dev` for the hot-reloading web app, and `pnpm tauri dev` when validating the desktop shell alongside the renderer. `pnpm build` performs a TypeScript check then emits a production bundle, which `pnpm preview` serves locally. For desktop releases, `pnpm tauri build` packages the Tauri app. Within `src-tauri`, run `cargo fmt`, `cargo clippy --all-targets`, and `cargo build` (or `cargo test`) to keep Rust code linted and healthy.

## Coding Style & Naming Conventions
TypeScript and React follow 2-space indentation, `camelCase` variables, and `PascalCase` components and file names such as `TagList.tsx`. Prefer functional components with hooks and colocate styles and tests. Rust modules rely on `rustfmt` defaults, using `snake_case` for functions and `PascalCase` for types; keep capability-specific logic isolated. Before committing, run `pnpm biome check .` to catch lint and format drift.

## Testing Guidelines
Author Vitest + React Testing Library specs beside the module under test (`ComponentName.test.tsx`). Pending broader automation, perform manual smoke checks with `pnpm dev` for web flows and `pnpm tauri dev` for desktop scenarios. Rust code should ship with targeted unit tests under `src-tauri/src/` and be exercised via `cargo test`.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat(tags):`, `fix(tauri):`, etc.) to describe intent precisely. Each PR should include a concise summary, reproduction or verification steps, linked issues (e.g., `Closes #123`), and before/after screenshots for UI work. Keep PRs scoped to a single concern to simplify review and avoid mixing unrelated refactors.

## Security & Configuration Tips
Grant only necessary permissions in `src-tauri/capabilities/`; avoid wildcard access. Validate and sanitize user input in the renderer before invoking Tauri commands. Store secrets in environment variables or secure Tauri config entries—never commit them to the repository.
