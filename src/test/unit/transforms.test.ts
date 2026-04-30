import { describe, expect, it } from 'vitest';
import {
  applyTransforms,
  normalizeWhitespace,
  truncateHint,
} from '../../transforms.js';
import type { TransformPattern } from '../../types.js';

// ─── truncateHint ───────────────────────────────────────────────────

describe('truncateHint', () => {
  it('returns value unchanged when maxLength is 0 (no truncation)', () => {
    expect(truncateHint('a very long class name', 0)).toBe(
      'a very long class name',
    );
  });

  it('returns value unchanged when shorter than maxLength', () => {
    expect(truncateHint('short', 10)).toBe('short');
  });

  it('returns value unchanged when equal to maxLength', () => {
    expect(truncateHint('exact', 5)).toBe('exact');
  });

  it('truncates and adds ellipsis when longer than maxLength', () => {
    expect(truncateHint('a very long class name', 10)).toBe('a very lon...');
  });

  it('returns original when truncation + ellipsis would not produce a shorter result', () => {
    // 'hello' (5) with maxLength=2 → 'he...' (5) — same length, no benefit
    expect(truncateHint('hello', 2)).toBe('hello');
    // 'hello' (5) with maxLength=3 → 'hel...' (6) — longer than original
    expect(truncateHint('hello', 3)).toBe('hello');
    // 'hello' (5) with maxLength=4 → 'hell...' (7) — longer than original
    expect(truncateHint('hello', 4)).toBe('hello');
  });

  it('truncates when removing 4+ chars makes result shorter', () => {
    // 'hello' (5) with maxLength=1 → 'h...' (4) — shorter than original
    expect(truncateHint('hello', 1)).toBe('h...');
    // 'hello world' (11) with maxLength=4 → 'hell...' (7) — shorter than 11
    expect(truncateHint('hello world', 4)).toBe('hell...');
  });

  it('character+start: keeps the end of the value', () => {
    expect(
      truncateHint(
        'flex items-center justify-between gap-4',
        21,
        'character',
        'start',
      ),
    ).toBe('...justify-between gap-4');
  });

  it('character+start: returns unchanged when within maxLength', () => {
    expect(truncateHint('short', 10, 'character', 'start')).toBe('short');
  });

  it('word+end: breaks at word boundary', () => {
    expect(
      truncateHint(
        'flex items-center justify-between gap-4',
        20,
        'word',
        'end',
      ),
    ).toBe('flex items-center...');
  });

  it('word+end: returns unchanged when within maxLength', () => {
    expect(truncateHint('short', 10, 'word', 'end')).toBe('short');
  });

  it('word+end: falls back to character slice when first word exceeds maxLength', () => {
    expect(truncateHint('superlongwordwithoutspaces', 10, 'word', 'end')).toBe(
      'superlongw...',
    );
  });

  it('word+end: handles single word that fits', () => {
    expect(truncateHint('flex', 10, 'word', 'end')).toBe('flex');
  });

  it('word+end: handles empty string', () => {
    expect(truncateHint('', 10, 'word', 'end')).toBe('');
  });

  it('word+end: exact fit does not truncate', () => {
    expect(truncateHint('flex items', 10, 'word', 'end')).toBe('flex items');
  });

  // 50% buffer: when only 1 word would be dropped and the full value
  // fits within maxLength + 50%, return the full value without truncation.

  it('word+end: returns full value when 1 word remains and fits within 50% buffer', () => {
    // 9 words × 4 chars + 8 spaces = 44 chars, maxLength=40
    // floor(40*1.5)=60, so 44 ≤ 60 → buffer applies, returns full value
    expect(
      truncateHint(
        'aaaa bbbb cccc dddd eeee ffff gggg hhhh iiii',
        40,
        'word',
        'end',
      ),
    ).toBe('aaaa bbbb cccc dddd eeee ffff gggg hhhh iiii');
  });

  it('word+end: still truncates when 1 word remains but exceeds 50% buffer', () => {
    // 61 chars (last word is 21 chars), maxLength=40 → floor(40*1.5)=60 → 61 > 60
    expect(
      truncateHint(
        'aaaa bbbb cccc dddd eeee ffff gggg hhhh iiiiiiiiiiiiiiiiiiiii',
        40,
        'word',
        'end',
      ),
    ).toBe('aaaa bbbb cccc dddd eeee ffff gggg hhhh...');
  });

  it('word+end: still truncates when 2+ words remain even within 50%', () => {
    // 10 words, 49 chars, maxLength=40 → 8 words fit (39 chars),
    // 2 words remain so buffer doesn't apply (even though 49 ≤ 60)
    expect(
      truncateHint(
        'aaaa bbbb cccc dddd eeee ffff gggg hhhh iiii jjjj',
        40,
        'word',
        'end',
      ),
    ).toBe('aaaa bbbb cccc dddd eeee ffff gggg hhhh...');
  });

  it('word+start: returns full value when 1 word remains and fits within 50% buffer', () => {
    // 44 chars, maxLength=40, floor(40*1.5)=60 → buffer applies (44 ≤ 60)
    expect(
      truncateHint(
        'aaaa bbbb cccc dddd eeee ffff gggg hhhh iiii',
        40,
        'word',
        'start',
      ),
    ).toBe('aaaa bbbb cccc dddd eeee ffff gggg hhhh iiii');
  });

  it('word+start: still truncates when 1 word remains but exceeds 50% buffer', () => {
    // 61 chars (first word is 21 chars), maxLength=40 → 61 > 60
    expect(
      truncateHint(
        'aaaaaaaaaaaaaaaaaaaaa bbbb cccc dddd eeee ffff gggg hhhh iiii',
        40,
        'word',
        'start',
      ),
    ).toBe('...bbbb cccc dddd eeee ffff gggg hhhh iiii');
  });

  it('word+start: still truncates when 2+ words remain even within 50%', () => {
    // 10 words, 49 chars, maxLength=40 → 8 words fit from end (39 chars),
    // 2 words remain so buffer doesn't apply (even though 49 ≤ 60)
    expect(
      truncateHint(
        'aaaa bbbb cccc dddd eeee ffff gggg hhhh iiii jjjj',
        40,
        'word',
        'start',
      ),
    ).toBe('...cccc dddd eeee ffff gggg hhhh iiii jjjj');
  });

  it('word+start: breaks at word boundary from end', () => {
    expect(
      truncateHint(
        'flex items-center justify-between gap-4',
        25,
        'word',
        'start',
      ),
    ).toBe('...justify-between gap-4');
  });

  it('word+start: returns unchanged when within maxLength', () => {
    expect(truncateHint('short', 10, 'word', 'start')).toBe('short');
  });

  it('word+start: falls back to character slice when last word exceeds maxLength', () => {
    expect(
      truncateHint('superlongwordwithoutspaces', 10, 'word', 'start'),
    ).toBe('...houtspaces');
  });

  it('word+start: handles empty string', () => {
    expect(truncateHint('', 10, 'word', 'start')).toBe('');
  });

  it('word+start: exact fit does not truncate', () => {
    expect(truncateHint('flex items', 10, 'word', 'start')).toBe('flex items');
  });

  // ─── configurable ellipsis ─────────────────────────────────────────

  it('honors a custom ellipsis (character+end)', () => {
    expect(
      truncateHint('a very long class name', 10, 'character', 'end', '…'),
    ).toBe('a very lon…');
  });

  it('honors a custom ellipsis (character+start)', () => {
    expect(
      truncateHint(
        'flex items-center justify-between gap-4',
        21,
        'character',
        'start',
        '…',
      ),
    ).toBe('…justify-between gap-4');
  });

  it('truncates without a marker when ellipsis is empty', () => {
    expect(
      truncateHint('a very long class name', 10, 'character', 'end', ''),
    ).toBe('a very lon');
  });

  it('length guard scales with ellipsis length', () => {
    // With default '...' (length 3): 'hello' (5) at maxLength=3 → no benefit, returns 'hello'
    expect(truncateHint('hello', 3)).toBe('hello');
    // With custom '…' (length 1): 'hello' (5) at maxLength=3 → 'hel…' (4) is shorter, truncates
    expect(truncateHint('hello', 3, 'character', 'end', '…')).toBe('hel…');
  });

  it('honors a custom ellipsis at word boundary', () => {
    expect(
      truncateHint(
        'flex items-center justify-between gap-4',
        20,
        'word',
        'end',
        '…',
      ),
    ).toBe('flex items-center…');
  });
});

// ─── applyTransforms — styles. removal ──────────────────────────────

describe('applyTransforms — styles. removal', () => {
  const patterns: TransformPattern[] = [
    { pattern: 'styles\\.', replacement: '', flags: 'g' },
  ];

  it.each([
    ['styles.container', 'container'],
    ['styles.a styles.b', 'a b'],
    ['styles.wrapper', 'wrapper'],
    ['noStyles', 'noStyles'],
    ['mystyles.foo', 'myfoo'],
  ])('transforms %s → %s', (input, expected) => {
    expect(applyTransforms(input, patterns)).toBe(expected);
  });
});

// ─── applyTransforms — classNames() unwrap ──────────────────────────

describe('applyTransforms — classNames() unwrap', () => {
  const patterns: TransformPattern[] = [
    { pattern: '^classNames\\((.*)\\)$', replacement: '$1', flags: 's' },
  ];

  it.each([
    ["classNames('a','b')", "'a','b'"],
    ["classNames('a', 'b', 'c')", "'a', 'b', 'c'"],
    ['not-classNames(x)', 'not-classNames(x)'],
    ['classNames()', ''],
  ])('transforms %s → %s', (input, expected) => {
    expect(applyTransforms(input, patterns)).toBe(expected);
  });

  it('handles multiline classNames with s flag', () => {
    const input = "classNames(\n  'a',\n  'b'\n)";
    expect(applyTransforms(input, patterns)).toBe("'a',\n  'b'");
  });
});

// ─── applyTransforms — combined defaults ────────────────────────────

describe('applyTransforms — combined default patterns', () => {
  const defaults: TransformPattern[] = [
    { pattern: 'styles\\.', replacement: '', flags: 'g' },
    { pattern: '^classNames\\((.*)\\)$', replacement: '$1', flags: 's' },
  ];

  it.each([
    ['styles.container', 'container'],
    ["classNames('a','b')", "'a','b'"],
    ['classNames(styles.a, styles.b)', 'a, b'],
    ['plain-class', 'plain-class'],
  ])('transforms %s → %s', (input, expected) => {
    expect(applyTransforms(input, defaults)).toBe(expected);
  });
});

// ─── applyTransforms — edge cases ───────────────────────────────────

describe('applyTransforms — trim', () => {
  it('trims leading/trailing whitespace from final result', () => {
    const patterns: TransformPattern[] = [
      { pattern: 'prefix-', replacement: '', flags: 'g' },
    ];
    expect(applyTransforms('  prefix-foo  ', patterns)).toBe('foo');
  });
});

describe('applyTransforms — invalid regex', () => {
  it('silently skips invalid patterns', () => {
    const patterns: TransformPattern[] = [
      { pattern: '[invalid', replacement: '', flags: 'g' },
    ];
    expect(applyTransforms('hello', patterns)).toBe('hello');
  });

  it('applies valid patterns even when mixed with invalid ones', () => {
    const patterns: TransformPattern[] = [
      { pattern: '[invalid', replacement: '', flags: 'g' },
      { pattern: 'foo', replacement: 'bar', flags: 'g' },
    ];
    expect(applyTransforms('foo', patterns)).toBe('bar');
  });
});

describe('applyTransforms — capture groups and flags', () => {
  it('supports $1 $2 capture group references', () => {
    const patterns: TransformPattern[] = [
      { pattern: '(\\w+)-(\\w+)', replacement: '$2-$1', flags: 'g' },
    ];
    expect(applyTransforms('foo-bar', patterns)).toBe('bar-foo');
  });

  it('respects case-insensitive flag', () => {
    const patterns: TransformPattern[] = [
      { pattern: 'FOO', replacement: 'bar', flags: 'gi' },
    ];
    expect(applyTransforms('foo FOO Foo', patterns)).toBe('bar bar bar');
  });
});

describe('applyTransforms — empty patterns', () => {
  it('returns trimmed input when patterns array is empty', () => {
    expect(applyTransforms('hello', [])).toBe('hello');
  });
});

// ─── applyTransforms — className variable removal ───────────────────

describe('applyTransforms — className variable removal', () => {
  const patterns: TransformPattern[] = [
    {
      pattern: '\\bclassName\\b\\s*,\\s*|,\\s*\\bclassName\\b|\\bclassName\\b',
      replacement: '',
      flags: 'g',
    },
  ];

  it.each([
    ['className, foo', 'foo'],
    ['foo, className', 'foo'],
    ['foo, className, bar', 'foo, bar'],
    ['className', ''],
    ['myClassName', 'myClassName'],
    ['classNameExtra', 'classNameExtra'],
  ])('transforms %s → %s', (input, expected) => {
    expect(applyTransforms(input, patterns)).toBe(expected);
  });
});

// ─── applyTransforms — full defaults ────────────────────────────────

describe('applyTransforms — full defaults', () => {
  const defaults: TransformPattern[] = [
    { pattern: '^classNames\\((.*)\\)$', replacement: '$1', flags: 's' },
    { pattern: '^clsx\\((.*)\\)$', replacement: '$1', flags: 's' },
    { pattern: '^cx\\((.*)\\)$', replacement: '$1', flags: 's' },
    { pattern: '^cn\\((.*)\\)$', replacement: '$1', flags: 's' },
    { pattern: 'styles\\.', replacement: '', flags: 'g' },
    { pattern: '\\$style\\.', replacement: '', flags: 'g' },
    {
      pattern: '\\bclassName\\b\\s*,\\s*|,\\s*\\bclassName\\b|\\bclassName\\b',
      replacement: '',
      flags: 'g',
    },
  ];

  it.each([
    ['classNames(className, styles.AlertsInfoItem)', 'AlertsInfoItem'],
    ["clsx('flex', 'mt-2')", "'flex', 'mt-2'"],
    ['cn(styles.base, isActive && styles.active)', 'base, isActive && active'],
    ["cx('a', 'b')", "'a', 'b'"],
    ['$style.container', 'container'],
    ['styles.wrapper', 'wrapper'],
    ['className', ''],
    ['plain-string', 'plain-string'],
  ])('transforms %s → %s', (input, expected) => {
    expect(applyTransforms(input, defaults)).toBe(expected);
  });
});

// ─── normalizeWhitespace ────────────────────────────────────────────

describe('normalizeWhitespace', () => {
  it('collapses runs of spaces to a single space', () => {
    expect(normalizeWhitespace('a   b    c')).toBe('a b c');
  });

  it('collapses newlines to a single space', () => {
    expect(normalizeWhitespace('a\nb\nc')).toBe('a b c');
  });

  it('collapses tabs to a single space', () => {
    expect(normalizeWhitespace('a\tb\t\tc')).toBe('a b c');
  });

  it('collapses carriage returns to a single space', () => {
    expect(normalizeWhitespace('a\r\nb')).toBe('a b');
  });

  it('collapses mixed runs (\\n + spaces + \\t) to a single space', () => {
    expect(normalizeWhitespace("'base', {\n  highlight: isActive,\n}")).toBe(
      "'base', { highlight: isActive, }",
    );
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeWhitespace('   foo   ')).toBe('foo');
    expect(normalizeWhitespace('\n\tfoo\n')).toBe('foo');
  });

  it('leaves single-spaced strings unchanged', () => {
    expect(normalizeWhitespace('flex items-center gap-2')).toBe(
      'flex items-center gap-2',
    );
  });

  it('returns empty string for empty input', () => {
    expect(normalizeWhitespace('')).toBe('');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeWhitespace('   \n\t  ')).toBe('');
  });

  it('collapses non-breaking spaces (\\u00a0) too', () => {
    expect(normalizeWhitespace('a  b')).toBe('a b');
  });
});
