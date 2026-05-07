# Changelog

## [0.1.2]

### Changed

- `transformPatterns` default now unwraps **any** wrapper-function call via a single generic pattern (`^[\w$]+\((.*)\)$`), replacing the four name-specific patterns for `classNames()`/`clsx()`/`cx()`/`cn()`. Aliased imports such as `import classNames as clsName from 'classnames'` (or any custom util) now unwrap correctly without extra configuration.

## [0.1.1]

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
