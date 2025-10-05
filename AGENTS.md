# Repository Guidelines

## Project Structure & Module Organization
- Application source lives in `src/`; React entry points are `src/main.tsx` and `src/App.tsx`, feature code should sit under `src/<feature>/...`.
- Shared assets (images, fonts) belong in `src/assets/`; styles should sit next to components as `ComponentName.css`.
- Desktop shell code is in `src-tauri/src/` with `main.rs` and helper modules; adjust app capabilities under `src-tauri/capabilities/` and config in `src-tauri/tauri.conf.json`.
- Static public files ship from `public/`; root-level tooling configs include `tsconfig*.json`, `vite.config.ts`, and `biome.json`.

## Build, Test, and Development Commands
- `pnpm install` aligns dependencies with `pnpm-lock.yaml`.
- `pnpm dev` runs the Vite dev server with HMR; use during frontend work.
- `pnpm tauri dev` launches the Tauri shell plus Vite for desktop flows.
- `pnpm build` runs `tsc` then creates a production bundle; `pnpm preview` serves the build locally.
- Run desktop releases with `pnpm tauri build`; inside `src-tauri`, use `cargo fmt`, `cargo clippy --all-targets`, and `cargo build` for Rust validation.

## Coding Style & Naming Conventions
- TypeScript modules use 2-space indentation, `camelCase` variables, and `PascalCase` components/file names (e.g., `TagList.tsx`).
- React components should remain functional with hooks; colocate tests and styles near the component.
- Rust follows `rustfmt` defaults with `snake_case` functions and `PascalCase` types; keep modules small and capability-scoped.
- Run Biome via `pnpm biome check <path>` before committing to surface lint/format issues.

## Testing Guidelines
- No automated suite ships yet; prefer Vitest + React Testing Library (`*.test.tsx`) beside the module under test.
- Use `cargo test` inside `src-tauri` for Rust units, grouping integration coverage by capability.
- Treat manual smoke checks (`pnpm dev`, `pnpm tauri dev`) as mandatory until automated coverage exists.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat:`, `fix:`, `chore:`, etc.); add a scope when it clarifies impact (`feat(tags): ...`).
- PRs should include a clear summary, before/after screenshots for UI, verification steps, and linked issues (`Closes #123`).
- Keep changes focused; split unrelated work across PRs to simplify review.

## Security & Configuration Tips
- Avoid wildcard Tauri capabilities; grant only what's required in `src-tauri/capabilities/`.
- Never pass unchecked user input to Tauri commands; validate in the renderer first.
- Store secrets in environment variables or the Tauri config, not in committed source.
