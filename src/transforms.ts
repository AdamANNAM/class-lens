import type { TransformPattern } from './types.js';

/**
 * Truncate a value to maxLength, adding '...' if truncated.
 * If maxLength is 0, no truncation is performed.
 *
 * @param type - 'character' cuts at exact char count, 'word' breaks at word boundary
 * @param position - 'end' keeps the start, 'start' keeps the end
 */
export const truncateValue = (
  value: string,
  maxLength: number,
  type: 'character' | 'word' = 'character',
  position: 'end' | 'start' = 'end'
) => {
  if (maxLength === 0 || value.length <= maxLength) {
    return value;
  }

  if (type === 'character') {
    if (position === 'end') {
      return value.slice(0, maxLength) + '...';
    }
    return '...' + value.slice(-maxLength);
  }

  // type === 'word'
  const words = value.split(' ');

  if (position === 'end') {
    let result = '';
    for (const word of words) {
      const candidate = result === '' ? word : result + ' ' + word;
      if (candidate.length > maxLength) break;
      result = candidate;
    }
    return result === '' ? value.slice(0, maxLength) + '...' : result + '...';
  }

  // position === 'start'
  let result = '';
  for (let i = words.length - 1; i >= 0; i--) {
    const candidate = result === '' ? words[i] : words[i] + ' ' + result;
    if (candidate.length > maxLength) break;
    result = candidate;
  }
  return result === '' ? '...' + value.slice(-maxLength) : '...' + result;
};

/**
 * Apply an ordered list of regex transform patterns to a value.
 * Each pattern is applied in sequence; invalid regexes are silently skipped.
 * The final result is trimmed.
 */
export const applyTransforms = (value: string, patterns: TransformPattern[]) => {
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
