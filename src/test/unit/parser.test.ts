import { describe, it, expect } from 'vitest';
import {
  extractClassValue,
  maskExpressionGTs,
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
    expect(extractClassValue("{isActive ? 'a' : 'b'}")).toBe(
      "isActive ? 'a' : 'b'",
    );
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
    expect(offsetToPosition('hello world', 5)).toEqual({
      line: 0,
      character: 5,
    });
  });

  it('returns correct position on second line', () => {
    expect(offsetToPosition('hello\nworld', 6)).toEqual({
      line: 1,
      character: 0,
    });
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
  const matchAll = (input: string) => {
    const re = new RegExp(OPENING_TAG_REGEX.source, OPENING_TAG_REGEX.flags);
    return [...input.matchAll(re)];
  };

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
  const matchAll = (input: string) => {
    const re = new RegExp(CLASS_ATTR_REGEX.source, CLASS_ATTR_REGEX.flags);
    return [...input.matchAll(re)];
  };

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

// ─── maskExpressionGTs ──────────────────────────────────────────────

describe('maskExpressionGTs', () => {
  it('passes through text with no JSX expressions unchanged', () => {
    const text = '<div className="foo">hello</div>';
    expect(maskExpressionGTs(text)).toBe(text);
  });

  it('masks `>` inside a JSX expression but preserves `>` outside', () => {
    const masked = maskExpressionGTs('<div className={a > b}>hi</div>');
    // Inside braces, `>` becomes the placeholder; outside (the tag-closing
    // `>` and the `</div>` `>`) stay as real `>`.
    expect(masked).toBe('<div className={a \x01 b}>hi</div>');
  });

  it('preserves length, newlines, and offsets', () => {
    const text = `<button onClick={() => x}>
  hi
</button>`;
    const masked = maskExpressionGTs(text);
    expect(masked.length).toBe(text.length);
    // Every newline in the original is at the same offset in the masked text.
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') expect(masked[i]).toBe('\n');
    }
  });

  it('masks `>` from a generic type signature inside `{...}`', () => {
    const text = `<input onChange={(e: ChangeEvent<HTMLInputElement>): void => {}} />`;
    const masked = maskExpressionGTs(text);
    // The two `>` characters inside the expression (generic close + arrow)
    // are both masked; the trailing `/>` is untouched.
    const insideExpr = masked.slice(
      text.indexOf('{(e:'),
      text.lastIndexOf('}}') + 2,
    );
    expect(insideExpr).not.toContain('>');
    expect(masked.endsWith('/>')).toBe(true);
  });

  it('handles nested braces without prematurely closing the expression', () => {
    const text = '<div className={fn({a: 1 > 0, b: { c > d }})}>x</div>';
    const masked = maskExpressionGTs(text);
    // Both inner `>` characters are masked; the tag-closing `>` (after the
    // outer `}`) and the `</div>` `>` are not.
    expect(masked.indexOf('\x01')).toBeGreaterThan(0);
    expect(masked.endsWith('</div>')).toBe(true);
    // The two original `>` outside any expression survive.
    expect(masked.match(/>/g)?.length).toBe(2);
  });

  it('leaves unbalanced `{` alone past the unmatched brace (best-effort)', () => {
    // A stray `{` with no matching `}` shouldn't mask the rest of the file
    // forever — once the scan walks past EOF, the masking stops naturally.
    // We don't assert anything strong here; just that the helper doesn't
    // throw and returns a string of equal length.
    const text = 'x { y > z';
    const masked = maskExpressionGTs(text);
    expect(masked.length).toBe(text.length);
  });
});
