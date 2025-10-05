# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This is a Tauri desktop application with a React + TypeScript frontend. The project consists of:

- **Frontend**: React 19 + TypeScript in `src/` using Vite as build tool
- **Backend**: Rust-based Tauri application in `src-tauri/`
- **Communication**: Frontend-backend communication via Tauri's `invoke()` API

Key architectural elements:
- Tauri handles native desktop functionality and window management
- React frontend renders in a webview
- Vite provides HMR development server on port 1420
- Rust backend uses serde for JSON serialization between frontend/backend
- Feature-based organization: UI features are organized under `src/features/` (e.g., `src/features/explore/`)
- Shared UI components in `src/components/ui/` using shadcn-style components
- Path alias `@/*` maps to `./src/*` for cleaner imports

## Development Commands

**Package Management**: Uses `pnpm` (not npm/yarn)

**Frontend Development**:
- `pnpm install` - Install dependencies
- `pnpm dev` - Start Vite dev server (web-only preview)
- `pnpm build` - Build frontend (runs `tsc` then `vite build`)
- `pnpm preview` - Preview built frontend

**Desktop Development**:
- `pnpm tauri dev` - Launch Tauri desktop app with HMR
- `pnpm tauri build` - Build desktop binaries for distribution

**Rust Tooling** (run from `src-tauri/` directory):
- `cargo fmt` - Format Rust code
- `cargo clippy` - Lint Rust code
- `cargo build` - Build Rust components
- `cargo test` - Run Rust tests (includes unit tests in `lib.rs`)

**Linting/Formatting**:
- Uses Biome for TypeScript/JavaScript linting and formatting
- Biome configured with 2-space indentation, double quotes, and auto-organize imports
- Run Biome commands with `pnpm biome check` or `pnpm biome format`

## Code Conventions

**TypeScript/React**:
- 2-space indentation
- Double quotes for strings (enforced by Biome)
- camelCase for variables/functions, PascalCase for components
- Functional components with hooks preferred
- Component files use PascalCase naming (e.g., `MyComponent.tsx`)
- Strict TypeScript configuration with unused locals/parameters checking
- Use `@/` path alias for imports from `src/` (e.g., `import { Foo } from "@/features/explore/types"`)
- Feature-based organization: group related components, types, and utilities under `src/features/{feature-name}/`

**Rust**:
- Follow rustfmt defaults
- snake_case for modules/functions, PascalCase for types
- Library crate named `tag_crucible_lib` (Windows compatibility requirement)
- Use `thiserror` for custom error types with serde serialization for frontend compatibility
- Tauri commands should be async and return `Result<T, E>` where E implements Serialize

## Application Domain

The application scans directories and displays file/folder information in a tree structure:
- `DirectoryNode` represents the tree structure with nested children
- `FileInfo` contains metadata (path, type, size, modified time)
- Backend exposes `scan_directory` and `scan_current_directory` Tauri commands
- Frontend uses TanStack Table for rendering tabular data
- Frontend state management uses React hooks (no external state library currently)

## Testing

- Frontend: No formal test framework configured yet. Suggested: Vitest + React Testing Library with `*.test.ts(x)` files
- Rust: Unit tests included in `src-tauri/src/lib.rs` using `#[cfg(test)]` modules. Run with `cargo test` from `src-tauri/` directory

## Important Notes

- Uses Conventional Commits format (`feat:`, `fix:`, `chore:`, etc.)
- Tauri capabilities should be minimal - only enable what's needed (configured in `src-tauri/capabilities/`)
- Never hardcode secrets - use environment variables and Tauri config
- Avoid `eval` or dynamic code execution in frontend
- Validate inputs before passing to Tauri commands
- Tailwind CSS v4 with `@tailwindcss/vite` plugin for styling
