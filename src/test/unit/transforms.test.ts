import { describe, it, expect } from 'vitest';
import { truncateValue, applyTransforms } from '../../transforms.js';
import type { TransformPattern } from '../../types.js';

// ─── truncateValue ───────────────────────────────────────────────────

describe('truncateValue', () => {
  it('returns value unchanged when maxLength is 0 (no truncation)', () => {
    expect(truncateValue('a very long class name', 0)).toBe('a very long class name');
  });

  it('returns value unchanged when shorter than maxLength', () => {
    expect(truncateValue('short', 10)).toBe('short');
  });

  it('returns value unchanged when equal to maxLength', () => {
    expect(truncateValue('exact', 5)).toBe('exact');
  });

  it('truncates and adds ellipsis when longer than maxLength', () => {
    expect(truncateValue('a very long class name', 10)).toBe('a very lon...');
  });

  it('truncates to 1 character plus ellipsis', () => {
    expect(truncateValue('hello', 1)).toBe('h...');
  });

  it('character+start: keeps the end of the value', () => {
    expect(truncateValue('flex items-center justify-between gap-4', 21, 'character', 'start'))
      .toBe('...justify-between gap-4');
  });

  it('character+start: returns unchanged when within maxLength', () => {
    expect(truncateValue('short', 10, 'character', 'start')).toBe('short');
  });

  it('word+end: breaks at word boundary', () => {
    expect(truncateValue('flex items-center justify-between gap-4', 20, 'word', 'end'))
      .toBe('flex items-center...');
  });

  it('word+end: returns unchanged when within maxLength', () => {
    expect(truncateValue('short', 10, 'word', 'end')).toBe('short');
  });

  it('word+end: falls back to character slice when first word exceeds maxLength', () => {
    expect(truncateValue('superlongwordwithoutspaces', 10, 'word', 'end'))
      .toBe('superlongw...');
  });

  it('word+end: handles single word that fits', () => {
    expect(truncateValue('flex', 10, 'word', 'end')).toBe('flex');
  });

  it('word+end: handles empty string', () => {
    expect(truncateValue('', 10, 'word', 'end')).toBe('');
  });

  it('word+end: exact fit does not truncate', () => {
    expect(truncateValue('flex items', 10, 'word', 'end')).toBe('flex items');
  });

  it('word+start: breaks at word boundary from end', () => {
    expect(truncateValue('flex items-center justify-between gap-4', 25, 'word', 'start'))
      .toBe('...justify-between gap-4');
  });

  it('word+start: returns unchanged when within maxLength', () => {
    expect(truncateValue('short', 10, 'word', 'start')).toBe('short');
  });

  it('word+start: falls back to character slice when last word exceeds maxLength', () => {
    expect(truncateValue('superlongwordwithoutspaces', 10, 'word', 'start'))
      .toBe('...houtspaces');
  });

  it('word+start: handles empty string', () => {
    expect(truncateValue('', 10, 'word', 'start')).toBe('');
  });

  it('word+start: exact fit does not truncate', () => {
    expect(truncateValue('flex items', 10, 'word', 'start')).toBe('flex items');
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
    ["classNames(styles.a, styles.b)", 'a, b'],
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
    { pattern: '\\bclassName\\b\\s*,\\s*|,\\s*\\bclassName\\b|\\bclassName\\b', replacement: '', flags: 'g' },
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
    { pattern: '\\bclassName\\b\\s*,\\s*|,\\s*\\bclassName\\b|\\bclassName\\b', replacement: '', flags: 'g' },
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
