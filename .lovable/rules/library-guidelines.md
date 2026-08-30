# 888clinic — Guidelines

## Components

The design system exports these components — import them from `@ws-a7fc10736ff184fd8478/50efd1dc-d72a-4a9d-bfbe-308b79416a94` and compose them before building anything from scratch:

`ReportTemplateEditor`

Per-component details (import stanzas, props, variants, examples) live in `.lovable/rules/libraries/{slug}/components.md` — on disk, not auto-loaded. Read that file or the component source when the name alone isn't enough.

## Theme Files

The design system's theme is delivered through the following files. The author's original source files carry the full wiring the design system needs — variable declarations, framework-specific directives, provider objects, etc. — and are the canonical import target.

- `@ws-a7fc10736ff184fd8478/50efd1dc-d72a-4a9d-bfbe-308b79416a94/styles.css` (source — preferred import)
- `@ws-a7fc10736ff184fd8478/50efd1dc-d72a-4a9d-bfbe-308b79416a94/dist/tokens.css` (auto-generated flat list of CSS custom properties — a raw-values fallback only; does NOT carry framework-specific wiring that the source files above provide)

