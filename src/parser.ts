import { matchClosingTags } from './tagMatcher.js';
import {
  applyTransforms,
  normalizeWhitespace,
  truncateHint,
} from './transforms.js';
import type { ExtractHintsOptions, OpeningTagInfo, Position } from './types.js';

/** Matches opening HTML/JSX tags with attributes. */
export const OPENING_TAG_REGEX =
  /<([A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*)(\s[^>]*?)(\s*\/?>)/gs;

/** Matches className= or class= attribute prefix. */
export const CLASS_ATTR_REGEX = /\b(?:className|class)\s*=\s*/g;

/** Placeholder used to mask `>` inside JSX expression braces. */
const GT_MASK_CHAR = '\x01';
const GT_MASK_REGEX = new RegExp(GT_MASK_CHAR, 'g');

/** Char-class regexes hoisted out of `maskExpressionGTs`'s hot loop. */
const TAG_NAME_FIRST = /[A-Za-z]/;
const TAG_NAME_REST = /[A-Za-z0-9.]/;

/**
 * Replace `>` characters that sit inside a tag's attribute area with a
 * placeholder so the tag regex (which uses `[^>]*?`) doesn't terminate the
 * tag at a `>` belonging to an arrow function (`=>`) or generic type (`<T>`)
 * inside a JSX expression value. Length and newlines are preserved so all
 * subsequent offsets line up with the original text.
 *
 * Critically, this mask is *scoped to tag attribute spans* — it does NOT
 * touch `>` characters inside JS function bodies or other braces that live
 * outside of an HTML/JSX tag's `<TagName ... >` region. A naive global
 * mask of every `{...}` would clobber the `>` of every inner element
 * inside a React component's `function() { return <div>...</div>; }`.
 */
export const maskExpressionGTs = (text: string) => {
  // Lazy: only materialize a char array when we actually need to mask a `>`.
  // Files without `>` inside attribute expressions skip the allocation entirely.
  let chars: string[] | null = null;
  let i = 0;
  const len = text.length;
  while (i < len) {
    // Look for a tag opening: `<` followed by an ASCII letter. Tag names
    // can include digits and dots after the first letter (e.g. Motion.div).
    const next = text[i + 1];
    if (text[i] !== '<' || !next || !TAG_NAME_FIRST.test(next)) {
      i++;
      continue;
    }
    let j = i + 1;
    while (j < len && TAG_NAME_REST.test(text[j])) j++;
    // Now scan the attribute area, tracking JSX-expression brace depth.
    // Mask `>` inside `{...}`; exit when we hit `>` at depth 0.
    let depth = 0;
    while (j < len) {
      const ch = text[j];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (ch === '>') {
        if (depth === 0) {
          j++;
          break;
        }
        if (!chars) chars = Array.from(text);
        chars[j] = GT_MASK_CHAR;
      }
      j++;
    }
    i = j;
  }
  return chars ? chars.join('') : text;
};

/** Restore masked `>` characters in a captured attribute substring. */
const unmask = (input: string) => input.replace(GT_MASK_REGEX, '>');

const isStringLiteral = (input: string) =>
  (input.startsWith('"') && input.endsWith('"')) ||
  (input.startsWith("'") && input.endsWith("'")) ||
  (input.startsWith('`') && input.endsWith('`'));

/**
 * Extract the class value from a raw attribute value string.
 * Strips surrounding quotes/backticks for string literals,
 * strips surrounding braces for JSX expressions.
 */
export const extractClassValue = (input: string) => {
  if (input.startsWith('{') && input.endsWith('}')) {
    const inner = input.slice(1, -1).trim();
    if (isStringLiteral(inner)) return inner.slice(1, -1);
    return inner;
  }

  if (isStringLiteral(input)) return input.slice(1, -1);

  return input;
};

/** Convert a byte offset in text to a line/character Position. */
export const offsetToPosition = (text: string, offset: number): Position => {
  let line = 0;
  let lastNewline = -1;

  for (let i = 0; i < offset; i++) {
    if (text[i] === '\n') {
      line++;
      lastNewline = i;
    }
  }

  return { line, character: offset - lastNewline - 1 };
};

/**
 * Extract the raw attribute value starting at a position in the attribute string.
 * Handles: "...", '...', `...`, {...} (with brace balancing)
 */
const extractRawAttributeValue = (attrs: string, start: number) => {
  if (start >= attrs.length) return null;

  const ch = attrs[start];

  if (ch === '"' || ch === "'" || ch === '`') {
    const end = attrs.indexOf(ch, start + 1);
    if (end === -1) return null;
    return attrs.slice(start, end + 1);
  }

  if (ch === '{') {
    let depth = 1;
    let i = start + 1;
    while (i < attrs.length && depth > 0) {
      if (attrs[i] === '{') depth++;
      else if (attrs[i] === '}') depth--;
      i++;
    }
    if (depth === 0) return attrs.slice(start, i);
    return null;
  }

  return null;
};

/**
 * Find all opening tags in text that have a className or class attribute.
 *
 * Internally masks `>` characters inside `{...}` JSX expressions so the
 * tag regex only terminates on the real tag-closing `>` (not on `>` that
 * belongs to an arrow function or a generic type inside an expression).
 */
export const findOpeningTagsWithClass = (text: string) => {
  const results: OpeningTagInfo[] = [];
  const masked = maskExpressionGTs(text);

  const tagRegex = new RegExp(
    OPENING_TAG_REGEX.source,
    OPENING_TAG_REGEX.flags,
  );
  // Hoisted out of the outer loop. Reset `lastIndex` per tag rather than
  // constructing a fresh regex on every match.
  const attrRegex = new RegExp(CLASS_ATTR_REGEX.source, CLASS_ATTR_REGEX.flags);
  let tagMatch: RegExpExecArray | null;

  while ((tagMatch = tagRegex.exec(masked)) !== null) {
    const tagName = tagMatch[1];
    const attrs = unmask(tagMatch[2]);
    const closing = tagMatch[3];
    const selfClosing = closing.trimEnd().endsWith('/>');
    const tagOffset = tagMatch.index;

    attrRegex.lastIndex = 0;
    let attrMatch: RegExpExecArray | null;

    while ((attrMatch = attrRegex.exec(attrs)) !== null) {
      const valueStart = attrMatch.index + attrMatch[0].length;
      const rawValue = extractRawAttributeValue(attrs, valueStart);

      if (rawValue !== null) {
        const classValue = extractClassValue(rawValue);
        results.push({ tagName, classValue, offset: tagOffset, selfClosing });
        break;
      }
    }
  }

  return results;
};

/**
 * Main entry point: extract all hints from document text.
 * Composes findOpeningTagsWithClass + matchClosingTags + transforms + truncation.
 */
export const extractHints = (
  text: string,
  options: ExtractHintsOptions = {},
) => {
  const {
    maxLength = 0,
    truncateType = 'character',
    truncatePosition = 'end',
    ellipsis = '...',
    transformPatterns = [],
    showSameLine = false,
    hideSelfClosing = false,
  } = options;

  const openingTags = findOpeningTagsWithClass(text);
  const tagsToMatch = hideSelfClosing
    ? openingTags.filter((t) => !t.selfClosing)
    : openingTags;
  const hints = matchClosingTags(text, tagsToMatch);

  for (const hint of hints) {
    if (transformPatterns.length > 0) {
      hint.value = applyTransforms(hint.value, transformPatterns);
    }
    hint.value = normalizeWhitespace(hint.value);
    if (maxLength > 0) {
      hint.value = truncateHint(
        hint.value,
        maxLength,
        truncateType,
        truncatePosition,
        ellipsis,
      );
    }
  }

  if (showSameLine) {
    return hints;
  }
  return hints.filter((h) => h.openingTagEndLine !== h.closingTagEnd.line);
};
