# Changelog

## [0.1.0]

### Added

- Inline annotations showing `className` and `class` attribute values next to closing tags
- Support for JSX, TSX, HTML, Vue, Svelte, Astro, PHP templates, and ERB files
- Two rendering modes: text decorations (default) and native VS Code inlay hints
- Annotations on self-closing tags (`<input />`, `<img />`, `<br />`); follow the `showSameLine` rule like paired tags. Set `classLens.hideSelfClosing` to `true` to skip them entirely.
- Configurable truncation: `maxLength`, `truncateType` (`character`/`word`), `truncatePosition` (`end`/`start`), and `ellipsis` marker
- Customizable `prefix`, `suffix`, and `opacity` for decoration rendering
- `showSameLine` to opt into annotations on tags whose opening and closing are on the same line
- `transformPatterns` for cleaning up class values (defaults unwrap `cn()`/`clsx()`/`cx()`/`classNames()` calls, strip `styles.`/`$style.` prefixes, and remove `className` literals from `cn()` arg lists)
- `excludedLanguages` per-language exclusion list
