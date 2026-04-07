import type { HintData, OpeningTagInfo } from './types.js';
import { offsetToPosition } from './parser.js';

/**
 * Build a regex that matches opening, self-closing, and closing tags
 * for a specific tag name.
 */
export const buildTagMatchRegex = (tagName: string) => {
  const escapedName = tagName.replace(/\./g, '\\.');
  return new RegExp(
    `<(${escapedName})(?:\\s[^>]*)?>|<(${escapedName})(?:\\s[^>]*)?\\s*/>|</(${escapedName})\\s*>`,
    'g'
  );
};

/**
 * Match opening tags (that have class attributes) with their closing tags.
 * Uses a stack-based approach per tag name to handle nesting.
 */
export const matchClosingTags = (text: string, openingTags: OpeningTagInfo[]): HintData[] => {
  if (openingTags.length === 0) return [];

  const hints: HintData[] = [];

  const stacks = new Map<string, { classValue: string; offset: number }[]>();

  for (const tag of openingTags) {
    if (!stacks.has(tag.tagName)) {
      stacks.set(tag.tagName, []);
    }
    stacks.get(tag.tagName)!.push({ classValue: tag.classValue, offset: tag.offset });
  }

  // For each tag name that has className, scan the entire text for
  // all opening and closing tags of that name. Use a stack to pair them.
  // When a closing tag matches an opening tag that has a className, emit a hint.
  const tagNames = new Set(openingTags.map((t) => t.tagName));

  for (const tagName of tagNames) {
    const classOpenings = stacks.get(tagName)!;
    const classOffsets = new Set(classOpenings.map((o) => o.offset));
    const classMap = new Map(classOpenings.map((o) => [o.offset, o.classValue]));

    const allTagRegex = buildTagMatchRegex(tagName);

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

  hints.sort((a, b) => {
    if (a.closingTagEnd.line !== b.closingTagEnd.line) {
      return a.closingTagEnd.line - b.closingTagEnd.line;
    }
    return a.closingTagEnd.character - b.closingTagEnd.character;
  });

  return hints;
};
