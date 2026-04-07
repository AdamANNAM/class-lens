import type { OpeningTagInfo, Position, TransformPattern } from './types.js';
import { truncateValue, applyTransforms } from './transforms.js';
import { matchClosingTags } from './tagMatcher.js';

// Re-export so existing consumers and tests keep working
export { truncateValue, applyTransforms } from './transforms.js';
export { matchClosingTags, buildTagMatchRegex } from './tagMatcher.js';

/** Matches opening HTML/JSX tags with attributes. */
export const OPENING_TAG_REGEX =
  /<([A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*)(\s[^>]*?)(\s*\/?>)/gs;

/** Matches className= or class= attribute prefix. */
export const CLASS_ATTR_REGEX = /\b(?:className|class)\s*=\s*/g;

const isStringLiteral = (s: string) =>
  (s.startsWith('"') && s.endsWith('"')) ||
  (s.startsWith("'") && s.endsWith("'")) ||
  (s.startsWith('`') && s.endsWith('`'));

/**
 * Extract the class value from a raw attribute value string.
 * Strips surrounding quotes/backticks for string literals,
 * strips surrounding braces for JSX expressions.
 */
export const extractClassValue = (raw: string) => {
  if (raw.startsWith('{') && raw.endsWith('}')) {
    const inner = raw.slice(1, -1).trim();
    if (isStringLiteral(inner)) return inner.slice(1, -1);
    return inner;
  }

  if (isStringLiteral(raw)) return raw.slice(1, -1);

  return raw;
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
 */
export const findOpeningTagsWithClass = (text: string) => {
  const results: OpeningTagInfo[] = [];

  const tagRegex = new RegExp(OPENING_TAG_REGEX.source, OPENING_TAG_REGEX.flags);
  let tagMatch: RegExpExecArray | null;

  while ((tagMatch = tagRegex.exec(text)) !== null) {
    const tagName = tagMatch[1];
    const attrs = tagMatch[2];
    const closing = tagMatch[3];
    const selfClosing = closing.trimEnd().endsWith('/>');
    const tagOffset = tagMatch.index;

    const attrRegex = new RegExp(CLASS_ATTR_REGEX.source, CLASS_ATTR_REGEX.flags);
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
  maxLength = 0,
  truncateType: 'character' | 'word' = 'character',
  truncatePosition: 'end' | 'start' = 'end',
  transformPatterns: TransformPattern[] = []
) => {
  const openingTags = findOpeningTagsWithClass(text);
  const nonSelfClosing = openingTags.filter((t) => !t.selfClosing);
  const hints = matchClosingTags(text, nonSelfClosing);

  for (const hint of hints) {
    if (transformPatterns.length > 0) {
      hint.value = applyTransforms(hint.value, transformPatterns);
    }
    if (maxLength > 0) {
      hint.value = truncateValue(hint.value, maxLength, truncateType, truncatePosition);
    }
  }

  return hints;
};
