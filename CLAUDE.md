# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This is a Tauri desktop application with a React + TypeScript frontend. The project consists of:

- **Frontend**: React 19 + TypeScript in `src/` using Vite as build tool
- **Backend**: Rust-based Tauri application in `src-tauri/`
- **Communication**: Frontend-backend communication via Tauri's `invoke()` API
- **Database**: DuckDB embedded database for persistent tagging system

Key architectural elements:
- Tauri handles native desktop functionality and window management
- React frontend renders in a webview
- Vite provides HMR development server on port 1420
- Rust backend uses serde for JSON serialization between frontend/backend
- Feature-based organization: UI features are organized under `src/features/` (e.g., `src/features/explore/`, `src/features/tagging/`)
- Shared UI components in `src/components/ui/` using shadcn-style components
- Path alias `@/*` maps to `./src/*` for cleaner imports

### Backend Module Structure

The Rust backend (`src-tauri/src/`) is organized into modules:
- `lib.rs` - Entry point, registers Tauri commands and manages DuckDB connection state via `DbConnection` struct
- `scan.rs` - Directory scanning functionality with `DirectoryNode` tree structure
- `tagging.rs` - Tag assignment and retrieval system with DuckDB persistence, path normalization, and ancestor tag inheritance logic
- `main.rs` - Minimal entry point that delegates to `tag_crucible_lib::run()`

The `tagging.rs` module includes comprehensive unit tests demonstrating tag inheritance, depth filtering, and path normalization behavior.

### Frontend Feature Structure

Features are self-contained with their own components, types, and utilities:
- `src/features/explore/` - Directory tree exploration UI with TanStack Table
  - `components/ExploreTable.tsx` - Main table component
  - `tableColumns.tsx` - Column definitions
  - `utils/buildExploreTableRows.ts` - Row transformation logic
  - `utils/formatPathForDisplay.ts` - Path display formatting
  - `types.ts` - TypeScript type definitions
- `src/features/tagging/` - Tagging UI components
  - `components/TaggingSidebar.tsx` - Tag management interface

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

**Testing**:
- Frontend: `pnpm vitest` or `pnpm vitest run` (Vitest configured in `vite.config.ts`)
- Rust: `cd src-tauri && cargo test` (unit tests in `src-tauri/src/scan.rs` and other modules)

**Rust Tooling** (run from `src-tauri/` directory):
- `cargo fmt` - Format Rust code
- `cargo clippy` - Lint Rust code
- `cargo build` - Build Rust components
- `cargo test` - Run Rust tests

**Linting/Formatting**:
- Uses Biome for TypeScript/JavaScript linting and formatting
- Biome configured with 2-space indentation, double quotes, and auto-organize imports
- `pnpm biome check` - Check for issues
- `pnpm biome format` - Format code
- `pnpm biome check --write` - Auto-fix issues

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
- Test files use `__tests__/*.test.ts(x)` naming convention

**Rust**:
- Follow rustfmt defaults
- snake_case for modules/functions, PascalCase for types
- Library crate named `tag_crucible_lib` (Windows compatibility requirement)
- Use `thiserror` for custom error types with serde serialization for frontend compatibility
- Error enums use `#[serde(tag = "type", content = "message")]` for structured error passing to frontend
- Tauri commands should be async and return `Result<T, E>` where E implements Serialize
- Test modules use `#[cfg(test)]` attribute

## Application Domain

The application scans directories, displays file/folder information in a tree structure, and allows tagging of paths:

**Directory Scanning**:
- `DirectoryNode` represents the tree structure with nested children
- `FileInfo` contains metadata (path, type, size, modified time)
- Backend exposes `scan_directory(path, depth)` and `scan_current_directory()` Tauri commands
- Tree building uses adjacency list approach with sorted children (directories first, then alphabetical)

**Tagging System**:
- Uses DuckDB embedded database stored in platform-specific app data directory
- Database schema: `path_tags(path TEXT, tag TEXT, path_depth INTEGER, created_at TIMESTAMP, PRIMARY KEY (path, tag))`
- Paths are normalized using `fs::canonicalize()` before storage to ensure consistency
- `assign_tag_to_paths(paths, tag)` Tauri command handles tag assignment with automatic deduplication
- `get_tags_for_directory(connection, root, max_depth)` retrieves tags for a directory tree, including:
  - Tags directly assigned to paths within the scan depth
  - Tags inherited from ancestor directories (parent, grandparent, etc.)
  - Depth-based filtering to limit descendant tag retrieval
- DuckDB connection managed as Tauri state via `DbConnection` struct with `Mutex<Option<Connection>>`
- Tag inheritance flows downward: child paths inherit all tags from their ancestors

**Frontend**:
- Uses TanStack Table for rendering tabular data
- Frontend state management uses React hooks (no external state library currently)

## Important Notes

- Uses Conventional Commits format (`feat:`, `fix:`, `chore:`, etc.)
- Tauri capabilities should be minimal - only enable what's needed (configured in `src-tauri/capabilities/`)
- DuckDB database is initialized on app startup in `lib.rs::setup()`
- Validate inputs before passing to Tauri commands
- Tailwind CSS v4 with `@tailwindcss/vite` plugin for styling
