import { HintData, OpeningTagInfo, Position } from './types.js';

/**
 * Extract the class value from a raw attribute value string.
 * Strips surrounding quotes/backticks for string literals,
 * strips surrounding braces for JSX expressions.
 */
export function extractClassValue(raw: string): string {
  // JSX expression: {something}
  if (raw.startsWith('{') && raw.endsWith('}')) {
    const inner = raw.slice(1, -1).trim();
    // Inner is a string literal: {"foo"}, {'foo'}, {`foo`}
    if (
      (inner.startsWith('"') && inner.endsWith('"')) ||
      (inner.startsWith("'") && inner.endsWith("'")) ||
      (inner.startsWith('`') && inner.endsWith('`'))
    ) {
      return inner.slice(1, -1);
    }
    // Otherwise return the expression as-is
    return inner;
  }

  // Plain string literal: "foo", 'foo', `foo`
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'")) ||
    (raw.startsWith('`') && raw.endsWith('`'))
  ) {
    return raw.slice(1, -1);
  }

  return raw;
}

/**
 * Convert a byte offset in text to a line/character Position.
 */
export function offsetToPosition(text: string, offset: number): Position {
  let line = 0;
  let lastNewline = -1;

  for (let i = 0; i < offset; i++) {
    if (text[i] === '\n') {
      line++;
      lastNewline = i;
    }
  }

  return { line, character: offset - lastNewline - 1 };
}

/**
 * Truncate a value to maxLength, adding '...' if truncated.
 * If maxLength is 0, no truncation is performed.
 *
 * @param type - 'character' cuts at exact char count, 'word' breaks at word boundary
 * @param position - 'end' keeps the start, 'start' keeps the end
 */
export function truncateValue(
  value: string,
  maxLength: number,
  type: 'character' | 'word' = 'character',
  position: 'end' | 'start' = 'end'
): string {
  if (maxLength === 0 || value.length <= maxLength) {
    return value;
  }

  if (type === 'character') {
    if (position === 'end') {
      return value.slice(0, maxLength) + '...';
    }
    // position === 'start'
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
}

/**
 * Find all opening tags in text that have a className or class attribute.
 * Returns info about each tag including the extracted class value.
 */
export function findOpeningTagsWithClass(text: string): OpeningTagInfo[] {
  const results: OpeningTagInfo[] = [];

  // Match opening tags: <TagName ... className=VALUE ... > or <TagName ... class=VALUE ... >
  // Tag names can be: lowercase, PascalCase, or dotted (e.g., Motion.div)
  const tagRegex = /<([A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*)(\s[^>]*?)(\s*\/?>)/gs;
  let tagMatch: RegExpExecArray | null;

  while ((tagMatch = tagRegex.exec(text)) !== null) {
    const tagName = tagMatch[1];
    const attrs = tagMatch[2];
    const closing = tagMatch[3];
    const selfClosing = closing.trimEnd().endsWith('/>');
    const tagOffset = tagMatch.index;

    // Look for className= or class= (but not className, just class when standalone)
    const attrRegex = /\b(?:className|class)\s*=\s*/g;
    let attrMatch: RegExpExecArray | null;

    while ((attrMatch = attrRegex.exec(attrs)) !== null) {
      const valueStart = attrMatch.index + attrMatch[0].length;
      const rawValue = extractRawAttributeValue(attrs, valueStart);

      if (rawValue !== null) {
        const classValue = extractClassValue(rawValue);
        results.push({
          tagName,
          classValue,
          offset: tagOffset,
          selfClosing,
        });
        break; // Only take the first className/class per tag
      }
    }
  }

  return results;
}

/**
 * Extract the raw attribute value starting at a position in the attribute string.
 * Handles: "...", '...', `...`, {...} (with brace balancing)
 */
function extractRawAttributeValue(attrs: string, start: number): string | null {
  if (start >= attrs.length) return null;

  const ch = attrs[start];

  // String literal with quotes
  if (ch === '"' || ch === "'" || ch === '`') {
    const end = attrs.indexOf(ch, start + 1);
    if (end === -1) return null;
    return attrs.slice(start, end + 1);
  }

  // JSX expression with braces - need to balance
  if (ch === '{') {
    let depth = 1;
    let i = start + 1;
    while (i < attrs.length && depth > 0) {
      if (attrs[i] === '{') depth++;
      else if (attrs[i] === '}') depth--;
      i++;
    }
    if (depth === 0) {
      return attrs.slice(start, i);
    }
    return null;
  }

  return null;
}

/**
 * Match opening tags (that have class attributes) with their closing tags.
 * Uses a stack-based approach per tag name to handle nesting.
 * Returns HintData[] with the class value and closing tag position.
 */
export function matchClosingTags(
  text: string,
  openingTags: OpeningTagInfo[]
): HintData[] {
  if (openingTags.length === 0) return [];

  const hints: HintData[] = [];

  // Build stacks per tag name from the opening tags (in order)
  // We need to match each closing tag to the most recent unmatched opening tag of that name
  const stacks = new Map<string, { classValue: string; offset: number }[]>();

  for (const tag of openingTags) {
    if (!stacks.has(tag.tagName)) {
      stacks.set(tag.tagName, []);
    }
    stacks.get(tag.tagName)!.push({ classValue: tag.classValue, offset: tag.offset });
  }

  // We also need to track ALL opening tags (including those without className)
  // to correctly handle nesting. We'll use a per-tagName counter approach.
  //
  // Strategy: For each tag name that has className, scan the entire text for
  // all opening and closing tags of that name. Use a stack to pair them.
  // When a closing tag matches an opening tag that has a className, emit a hint.

  const tagNames = new Set(openingTags.map((t) => t.tagName));

  for (const tagName of tagNames) {
    const classOpenings = stacks.get(tagName)!;
    const classOffsets = new Set(classOpenings.map((o) => o.offset));
    const classMap = new Map(classOpenings.map((o) => [o.offset, o.classValue]));

    // Find ALL opening tags of this tagName (with or without className) and closing tags
    // Escape dots in tag name for regex
    const escapedName = tagName.replace(/\./g, '\\.');
    const allTagRegex = new RegExp(
      `<(${escapedName})(?:\\s[^>]*)?>|<(${escapedName})(?:\\s[^>]*)?\\s*/>|</(${escapedName})\\s*>`,
      'g'
    );

    // Stack of opening tag offsets
    const openStack: number[] = [];
    let match: RegExpExecArray | null;

    while ((match = allTagRegex.exec(text)) !== null) {
      if (match[3]) {
        // Closing tag </tagName>
        if (openStack.length > 0) {
          const openingOffset = openStack.pop()!;
          if (classOffsets.has(openingOffset)) {
            const closingEnd = match.index + match[0].length - 1;
            hints.push({
              value: classMap.get(openingOffset)!,
              closingTagEnd: offsetToPosition(text, closingEnd),
              tagName,
            });
          }
        }
      } else if (match[2]) {
        // Self-closing tag - don't push to stack
      } else if (match[1]) {
        // Opening tag
        openStack.push(match.index);
      }
    }
  }

  // Sort hints by position (line then character)
  hints.sort((a, b) => {
    if (a.closingTagEnd.line !== b.closingTagEnd.line) {
      return a.closingTagEnd.line - b.closingTagEnd.line;
    }
    return a.closingTagEnd.character - b.closingTagEnd.character;
  });

  return hints;
}

/**
 * Main entry point: extract all hints from document text.
 * Composes findOpeningTagsWithClass + matchClosingTags + truncation.
 */
export function extractHints(
  text: string,
  maxLength: number = 0,
  truncateType: 'character' | 'word' = 'character',
  truncatePosition: 'end' | 'start' = 'end'
): HintData[] {
  const openingTags = findOpeningTagsWithClass(text);
  const nonSelfClosing = openingTags.filter((t) => !t.selfClosing);
  const hints = matchClosingTags(text, nonSelfClosing);

  if (maxLength > 0) {
    for (const hint of hints) {
      hint.value = truncateValue(hint.value, maxLength, truncateType, truncatePosition);
    }
  }

  return hints;
}
