import type { TransformPattern } from './types.js';

/**
 * Truncate a hint to maxLength, appending the configured ellipsis if truncated.
 * If maxLength is 0, no truncation is performed.
 *
 * @param type - 'character' cuts at exact char count, 'word' breaks at word boundary
 * @param position - 'end' keeps the start, 'start' keeps the end
 * @param ellipsis - marker inserted at the truncated edge (default '...')
 */
export const truncateHint = (
  hint: string,
  maxLength: number,
  type: 'character' | 'word' = 'character',
  position: 'end' | 'start' = 'end',
  ellipsis: string = '...',
) => {
  if (maxLength === 0 || hint.length <= maxLength) {
    return hint;
  }

  // Don't truncate if adding the ellipsis would make the result no shorter than the original
  if (hint.length <= maxLength + ellipsis.length) {
    return hint;
  }

  if (type === 'character' && position === 'end') {
    return hint.slice(0, maxLength) + ellipsis;
  }
  if (type === 'character') {
    return ellipsis + hint.slice(-maxLength);
  }

  // type === 'word'
  const words = hint.split(' ');
  const ordered = position === 'end' ? words : [...words].reverse();
  const count = wordsThatFit(ordered, maxLength);

  // When only 1 word would be dropped, just keep it (if within 25% of maxLength)
  if (
    count === words.length - 1 &&
    hint.length <= Math.floor(maxLength * 1.25)
  ) {
    return hint;
  }

  if (count === 0) {
    return position === 'end'
      ? hint.slice(0, maxLength) + ellipsis
      : ellipsis + hint.slice(-maxLength);
  }

  return position === 'end'
    ? words.slice(0, count).join(' ') + ellipsis
    : ellipsis + words.slice(-count).join(' ');
};

/** Returns how many leading words fit within maxLength when joined by spaces. */
const wordsThatFit = (words: string[], maxLength: number) => {
  let length = 0;
  for (let i = 0; i < words.length; i++) {
    length += (i > 0 ? 1 : 0) + words[i].length;
    if (length > maxLength) return i;
  }
  return words.length;
};

/**
 * Apply an ordered list of regex transform patterns to a value.
 * Each pattern is applied in sequence; invalid regexes are silently skipped.
 * The final result is trimmed.
 */
export const applyTransforms = (
  value: string,
  patterns: TransformPattern[],
) => {
  let result = value;
  for (const { pattern, replacement, flags } of patterns) {
    try {
      const re = new RegExp(pattern, flags);
      result = result.replace(re, replacement);
    } catch {
      // Invalid regex — skip
    }
  }
  return result.trim();
};

/**
 * Collapse runs of whitespace (spaces, tabs, newlines) into a single space
 * and trim. Used so multiline className expressions render as one tidy line.
 */
export const normalizeWhitespace = (value: string) =>
  value.replace(/\s+/g, ' ').trim();
