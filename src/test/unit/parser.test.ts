import { describe, it, expect } from 'vitest';
import {
  extractClassValue,
  offsetToPosition,
  OPENING_TAG_REGEX,
  CLASS_ATTR_REGEX,
} from '../../parser.js';

// ─── extractClassValue ───────────────────────────────────────────────

describe('extractClassValue', () => {
  it('strips double quotes from string literal', () => {
    expect(extractClassValue('"foo bar"')).toBe('foo bar');
  });

  it('strips single quotes from string literal', () => {
    expect(extractClassValue("'foo bar'")).toBe('foo bar');
  });

  it('strips backticks from template literal', () => {
    expect(extractClassValue('`foo bar`')).toBe('foo bar');
  });

  it('strips braces and quotes from JSX string expression {" "}', () => {
    expect(extractClassValue('{"foo bar"}')).toBe('foo bar');
  });

  it('strips braces and backticks from JSX template literal', () => {
    expect(extractClassValue('{`foo ${bar}`}')).toBe('foo ${bar}');
  });

  it('returns expression content for JSX expressions like {styles.container}', () => {
    expect(extractClassValue('{styles.container}')).toBe('styles.container');
  });

  it('returns ternary expression as-is', () => {
    expect(extractClassValue("{isActive ? 'a' : 'b'}")).toBe("isActive ? 'a' : 'b'");
  });

  it('returns function call expression as-is', () => {
    expect(extractClassValue("{cn('a', { b: c })}")).toBe("cn('a', { b: c })");
  });

  it('handles empty string value', () => {
    expect(extractClassValue('""')).toBe('');
  });

  it('handles empty JSX expression with string', () => {
    expect(extractClassValue('{""}')).toBe('');
  });
});

// ─── offsetToPosition ────────────────────────────────────────────────

describe('offsetToPosition', () => {
  it('returns line 0, character 0 for offset 0', () => {
    expect(offsetToPosition('hello', 0)).toEqual({ line: 0, character: 0 });
  });

  it('returns correct character on first line', () => {
    expect(offsetToPosition('hello world', 5)).toEqual({ line: 0, character: 5 });
  });

  it('returns correct position on second line', () => {
    expect(offsetToPosition('hello\nworld', 6)).toEqual({ line: 1, character: 0 });
  });

  it('handles multiple newlines', () => {
    const text = 'line1\nline2\nline3';
    expect(offsetToPosition(text, 12)).toEqual({ line: 2, character: 0 });
  });

  it('handles offset at end of line (newline character)', () => {
    const text = 'hello\nworld';
    expect(offsetToPosition(text, 5)).toEqual({ line: 0, character: 5 });
  });

  it('handles offset in middle of second line', () => {
    const text = 'abc\ndefgh';
    expect(offsetToPosition(text, 6)).toEqual({ line: 1, character: 2 });
  });
});

// ─── OPENING_TAG_REGEX ──────────────────────────────────────────────

describe('OPENING_TAG_REGEX', () => {
  function matchAll(input: string) {
    const re = new RegExp(OPENING_TAG_REGEX.source, OPENING_TAG_REGEX.flags);
    return [...input.matchAll(re)];
  }

  it.each([
    ['<div className="a">', 'div'],
    ['<MyComponent className="b">', 'MyComponent'],
    ['<Motion.div className="c">', 'Motion.div'],
    ['<input type="text" />', 'input'],
    ['<Ns.Sub.Deep className="d">', 'Ns.Sub.Deep'],
  ])('matches %s → tagName=%s', (input, expectedTag) => {
    const matches = matchAll(input);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0][1]).toBe(expectedTag);
  });

  it('does not match plain text without tags', () => {
    const matches = matchAll('no tags here');
    expect(matches).toHaveLength(0);
  });

  it('captures self-closing marker in group 3', () => {
    const matches = matchAll('<br className="x" />');
    expect(matches).toHaveLength(1);
    expect(matches[0][3].trim()).toBe('/>');
  });
});

// ─── CLASS_ATTR_REGEX ───────────────────────────────────────────────

describe('CLASS_ATTR_REGEX', () => {
  function matchAll(input: string) {
    const re = new RegExp(CLASS_ATTR_REGEX.source, CLASS_ATTR_REGEX.flags);
    return [...input.matchAll(re)];
  }

  it.each([
    ['className="foo"', true],
    ['class="foo"', true],
    ['className ="foo"', true],
    ['class = "foo"', true],
    ['id="test"', false],
    ['myClassName="foo"', false],
  ])('input %s → matches=%s', (input, shouldMatch) => {
    const matches = matchAll(input);
    if (shouldMatch) {
      expect(matches.length).toBeGreaterThanOrEqual(1);
    } else {
      expect(matches).toHaveLength(0);
    }
  });
});
