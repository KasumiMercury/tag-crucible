# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This is a Tauri desktop application with a React + TypeScript frontend. The project consists of:

- **Frontend**: React 19 + TypeScript in `src/` using Vite as build tool
- **Backend**: Rust-based Tauri application in `src-tauri/` 
- **Communication**: Frontend-backend communication via Tauri's `invoke()` API

Key architectural elements:
- Tauri handles native desktop functionality and window management
- React frontend renders in a webview with strict CSP disabled
- Vite provides HMR development server on port 1420
- Rust backend uses serde for JSON serialization between frontend/backend

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
- `cargo test` - Run Rust tests

## Code Conventions

**TypeScript/React**:
- 2-space indentation
- camelCase for variables/functions, PascalCase for components
- Functional components with hooks preferred
- Component files use PascalCase naming (e.g., `MyComponent.tsx`)
- Strict TypeScript configuration with unused locals/parameters checking

**Rust**:
- Follow rustfmt defaults
- snake_case for modules/functions, PascalCase for types
- Library crate named `tag_crucible_lib` (Windows compatibility)

## Testing

No formal test framework is currently configured. The AGENTS.md file suggests:
- Frontend: Add Vitest + React Testing Library with `*.test.ts(x)` files
- Rust: Use `cargo test` with `#[cfg(test)]` modules

## Important Notes

- Uses Conventional Commits format (`feat:`, `fix:`, `chore:`, etc.)
- Tauri capabilities should be minimal - only enable what's needed
- Never hardcode secrets - use environment variables and Tauri config
- Avoid `eval` or dynamic code execution in frontend
- Validate inputs before passing to Tauri commands