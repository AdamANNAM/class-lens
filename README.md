# Class Lens

See your `className` and `class` values at a glance. Class Lens displays inline annotations next to closing tags, so you always know which CSS classes an element uses without scrolling back to the opening tag.

## What It Does

```jsx
<div className="flex items-center gap-4">
  <span className="text-lg font-bold">
    Hello World
  </span>                                        // text-lg font-bold
</div>                                           // flex items-center gap-4
```

When your JSX, HTML, or template markup gets deeply nested, matching a `</div>` to its opening tag means scrolling up and hunting for the right line. Class Lens solves this by showing the `className` or `class` value as a faded annotation right after each closing tag.

## Features

- **Works everywhere** — JSX, TSX, HTML, Vue, Svelte, Astro, PHP templates, ERB, and any file that uses `className=` or `class=` attributes
- **Two rendering modes** — text decorations (default, looks like a comment) or native VS Code inlay hints
- **Handles dynamic values** — template literals, ternary expressions, function calls like `cn()` and `clsx()` are all displayed
- **Zero config** — works out of the box, active on all languages by default
- **Lightweight** — no AST parsing, no language server, just fast regex matching

## Supported Patterns

| Code | Annotation |
|------|------------|
| `className="flex gap-4"` | `flex gap-4` |
| `class="container mx-auto"` | `container mx-auto` |
| `className={styles.wrapper}` | `styles.wrapper` |
| `` className={`text-${color}`} `` | `` text-${color} `` |
| `className={active ? 'on' : 'off'}` | `active ? 'on' : 'off'` |
| `className={cn('base', { bold: x })}` | `cn('base', { bold: x })` |

Self-closing tags (`<img />`, `<br />`, `<input />`) are ignored since they have no closing tag.

## Settings

All settings are under `classnamePreview.*` in VS Code settings.

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `true` | Enable or disable annotations |
| `renderMode` | `"decoration"` | `"decoration"` for text decorations, `"inlayHint"` for native inlay hints |
| `maxLength` | `0` | Truncate long values (0 = no limit) |
| `fontStyle` | `"italic"` | `"italic"` or `"normal"` |
| `opacity` | `"0.9"` | Opacity of the annotation text |
| `prefix` | `"// "` | Text before the class value |
| `excludedLanguages` | `[]` | Language IDs to exclude (e.g. `["markdown", "json"]`) |

## Render Modes

**Text Decorations** (default) — appends faded text after the closing tag, styled like a comment. Works in any theme.

**Inlay Hints** — uses VS Code's native inlay hint API. Respects your editor's inlay hint settings and theme colors. Toggle with `"classnamePreview.renderMode": "inlayHint"`.

## FAQ

**Does it work with Tailwind CSS?**
Yes. Tailwind classes are just string values in `className` — they display exactly as written.

**Does it slow down my editor?**
No. The parser is a lightweight regex pass over the document text with a 200ms debounce on changes. There's no AST, no language server, and no file I/O.

**Can I use it with a language not listed?**
Yes. Class Lens runs on all languages by default. If it finds `className=` or `class=` in any file, it shows annotations. Use `excludedLanguages` to turn it off for specific languages.

**Why don't I see annotations on `<img />` or `<br />`?**
Self-closing tags have no closing tag to annotate, so they're skipped.
