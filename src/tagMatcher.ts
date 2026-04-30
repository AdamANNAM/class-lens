import { maskExpressionGTs } from './parser.js';
import type { HintData, OpeningTagInfo, Position } from './types.js';

/**
 * Build a regex that matches opening, self-closing, and closing tags
 * for a specific tag name.
 */
export const buildTagMatchRegex = (tagName: string) => {
  const escapedName = tagName.replace(/\./g, '\\.');
  return new RegExp(
    `<(${escapedName})(?:\\s[^>]*)?>|<(${escapedName})(?:\\s[^>]*)?\\s*/>|</(${escapedName})\\s*>`,
    'g',
  );
};

/**
 * Build an array of byte offsets where each line begins. lineStarts[0] is
 * always 0; lineStarts[i] is the offset of the first character of line i.
 *
 * Used to convert offsets to Position in O(log lines) rather than O(offset).
 * This matters because matchClosingTags calls offsetToPosition once per
 * matched tag (O(N) tags), and the linear scan would otherwise be
 * O(N × file_length) — quadratic in document size.
 */
const buildLineStarts = (text: string): number[] => {
  const starts: number[] = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10 /* \n */) starts.push(i + 1);
  }
  return starts;
};

/**
 * Binary-search a precomputed lineStarts table to convert an offset into a
 * line/character Position. Equivalent to `offsetToPosition` from parser.ts
 * but O(log lines) instead of O(offset).
 */
const positionFromOffset = (lineStarts: number[], offset: number): Position => {
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1;
    if (lineStarts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return { line: lo, character: offset - lineStarts[lo] };
};

/**
 * Match opening tags (that have class attributes) with their closing tags.
 * Uses a stack-based approach per tag name to handle nesting.
 */
export const matchClosingTags = (
  text: string,
  openingTags: OpeningTagInfo[],
): HintData[] => {
  if (openingTags.length === 0) return [];

  // Mask `>` inside `{...}` JSX expressions so the per-tag regex below only
  // terminates on real tag-closing `>` characters. Mask preserves length
  // and newlines, so all match indices remain valid for offset→position.
  const masked = maskExpressionGTs(text);
  const lineStarts = buildLineStarts(text);

  const hints: HintData[] = [];

  const stacks = new Map<string, { classValue: string; offset: number }[]>();

  for (const tag of openingTags) {
    if (!stacks.has(tag.tagName)) {
      stacks.set(tag.tagName, []);
    }
    stacks
      .get(tag.tagName)!
      .push({ classValue: tag.classValue, offset: tag.offset });
  }

  // For each tag name that has className, scan the entire text for
  // all opening and closing tags of that name. Use a stack to pair them.
  // When a closing tag matches an opening tag that has a className, emit a hint.
  const tagNames = new Set(openingTags.map((t) => t.tagName));

  for (const tagName of tagNames) {
    const classOpenings = stacks.get(tagName)!;
    const classOffsets = new Set(classOpenings.map((o) => o.offset));
    const classMap = new Map(
      classOpenings.map((o) => [o.offset, o.classValue]),
    );

    const allTagRegex = buildTagMatchRegex(tagName);

    const openStack: { startOffset: number; endOffset: number }[] = [];
    let match: RegExpExecArray | null;

    while ((match = allTagRegex.exec(masked)) !== null) {
      if (match[3]) {
        // Closing tag </tagName>
        if (openStack.length > 0) {
          const opening = openStack.pop()!;
          if (classOffsets.has(opening.startOffset)) {
            const closingEnd = match.index + match[0].length - 1;
            hints.push({
              value: classMap.get(opening.startOffset)!,
              closingTagEnd: positionFromOffset(lineStarts, closingEnd),
              openingTagEndLine: positionFromOffset(
                lineStarts,
                opening.endOffset,
              ).line,
              tagName,
            });
          }
        }
      } else if (match[1] || match[2]) {
        // Opening or self-closing tag.
        // The opening alternative `<tag ...>` greedily consumes self-closing
        // input too (`[^>]*` happily eats the `/`), so we can't trust which
        // capture group fired — detect self-closing from the matched text.
        const isSelfClosing = match[0].endsWith('/>');
        if (isSelfClosing) {
          // Emit a hint if it carries a className. No stack push (no children).
          // openingTagEndLine uses the line of the opening '<' so the
          // showSameLine filter can distinguish single-line vs multi-line tags.
          if (classOffsets.has(match.index)) {
            const closingEnd = match.index + match[0].length - 1;
            hints.push({
              value: classMap.get(match.index)!,
              closingTagEnd: positionFromOffset(lineStarts, closingEnd),
              openingTagEndLine: positionFromOffset(lineStarts, match.index)
                .line,
              tagName,
            });
          }
        } else {
          openStack.push({
            startOffset: match.index,
            endOffset: match.index + match[0].length - 1,
          });
        }
      }
    }
  }

  hints.sort((a, b) => {
    if (a.closingTagEnd.line !== b.closingTagEnd.line) {
      return a.closingTagEnd.line - b.closingTagEnd.line;
    }
    return a.closingTagEnd.character - b.closingTagEnd.character;
  });

  return hints;
};
