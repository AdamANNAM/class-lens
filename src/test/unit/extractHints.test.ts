import { describe, expect, it } from 'vitest';
import { extractHints } from '../../parser.js';

// ─── extractHints (integration of all parser functions) ──────────────

describe('extractHints', () => {
  it('returns hints for simple JSX', () => {
    const text = '<div className="container">hello</div>';
    const hints = extractHints(text, { showSameLine: true });
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('container');
    expect(hints[0].tagName).toBe('div');
  });

  it('applies truncation when maxLength > 0', () => {
    const text = '<div className="a-very-long-class-name">hello</div>';
    const hints = extractHints(text, { maxLength: 10, showSameLine: true });
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('a-very-lon...');
  });

  it('applies character+start truncation', () => {
    const text =
      '<div className="flex items-center justify-between gap-4">hello</div>';
    const hints = extractHints(text, {
      maxLength: 21,
      truncateType: 'character',
      truncatePosition: 'start',
      showSameLine: true,
    });
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('...justify-between gap-4');
  });

  it('applies word+end truncation', () => {
    const text =
      '<div className="flex items-center justify-between gap-4">hello</div>';
    const hints = extractHints(text, {
      maxLength: 20,
      truncateType: 'word',
      truncatePosition: 'end',
      showSameLine: true,
    });
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('flex items-center...');
  });

  it('applies word+start truncation', () => {
    const text =
      '<div className="flex items-center justify-between gap-4">hello</div>';
    const hints = extractHints(text, {
      maxLength: 25,
      truncateType: 'word',
      truncatePosition: 'start',
      showSameLine: true,
    });
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('...justify-between gap-4');
  });

  it('does not truncate when maxLength is 0', () => {
    const text = '<div className="a-very-long-class-name">hello</div>';
    const hints = extractHints(text, { showSameLine: true });
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('a-very-long-class-name');
  });

  it('includes single-line self-closing tags when showSameLine is true', () => {
    const text = '<img className="hero" />';
    const hints = extractHints(text, { showSameLine: true });
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('hero');
    expect(hints[0].tagName).toBe('img');
  });

  it('hides single-line self-closing tags by default (showSameLine false)', () => {
    const text = '<img className="hero" />';
    const hints = extractHints(text);
    expect(hints).toHaveLength(0);
  });

  it('shows multi-line self-closing tags by default', () => {
    const text = `<input
  className="foo"
/>`;
    const hints = extractHints(text);
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('foo');
    expect(hints[0].tagName).toBe('input');
  });

  it('hideSelfClosing suppresses self-closing tag hints', () => {
    const text = `<input
  className="foo"
/>`;
    const hints = extractHints(text, { hideSelfClosing: true });
    expect(hints).toHaveLength(0);
  });

  it('hideSelfClosing does not affect regular tags', () => {
    const text = `<div className="outer">
  <input className="inner" />
</div>`;
    const hints = extractHints(text, { hideSelfClosing: true });
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('outer');
  });

  it('self-closing tag inside a regular tag does not break the stack', () => {
    const text = `<div className="outer">
  <img className="hero" />
</div>`;
    const hints = extractHints(text, { showSameLine: true });
    expect(hints).toHaveLength(2);
    expect(hints[0].value).toBe('hero');
    expect(hints[0].tagName).toBe('img');
    expect(hints[1].value).toBe('outer');
    expect(hints[1].tagName).toBe('div');
  });

  it('self-closing tag without className produces no hint', () => {
    const text = '<img src="hero.png" />';
    const hints = extractHints(text, { showSameLine: true });
    expect(hints).toHaveLength(0);
  });

  it('multi-line self-closing tag with complex classNames() expression', () => {
    // Self-closing <input /> with attributes both before and after className,
    // a multi-line classNames() call, computed property keys whose key is a
    // nested function call, and a JSX expression value containing a string
    // literal with " quotes.
    const text = `<section>
  <input
    ref={ref}
    disabled={state.locked}
    className={classNames(
      base,
      styles.field,
      { [keyOf(styles.modA)]: state.locked },
      { [keyOf(styles.modB)]: !!state.getError("amount") },
    )}
    inputMode="decimal"
    value={value}
  />
</section>`;
    const hints = extractHints(text, {
      transformPatterns: [
        { pattern: '^classNames\\((.*)\\)$', replacement: '$1', flags: 's' },
        { pattern: 'styles\\.', replacement: '', flags: 'g' },
      ],
    });
    expect(hints).toHaveLength(1);
    expect(hints[0].tagName).toBe('input');
    // Brace-balanced JSX expression extracted intact, classNames() unwrapped,
    // styles. stripped, whitespace collapsed to a single line.
    expect(hints[0].value).not.toMatch(/\n/);
    expect(hints[0].value).not.toContain('classNames(');
    expect(hints[0].value).not.toContain('styles.');
    expect(hints[0].value).toContain('field');
    expect(hints[0].value).toContain('[keyOf(modA)]');
    expect(hints[0].value).toContain('[keyOf(modB)]');
    expect(hints[0].value).toContain('"amount"');
  });

  it('hideSelfClosing suppresses the multi-line self-closing input case', () => {
    const text = `<input
  className={classNames(styles.a, { [b]: c })}
/>`;
    const hints = extractHints(text, { hideSelfClosing: true });
    expect(hints).toHaveLength(0);
  });

  it('handles `>` inside JSX expressions (arrow functions, generics) on a self-closing tag', () => {
    // The previously-broken case: `>` characters inside {...} (from `=>` arrow
    // functions and from generic types like `<HTMLInputElement>`) used to make
    // the regex think the tag ended early — self-closing tags got no hint at
    // all. Now masked away during parsing.
    const text = `<input
  className="hero"
  onChange={(e: ChangeEvent<HTMLInputElement>): void => {
    state.update();
  }}
/>`;
    const hints = extractHints(text);
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('hero');
    expect(hints[0].tagName).toBe('input');
  });

  it('handles `>` inside JSX expressions on a paired tag', () => {
    // Same fix benefits paired tags whose className sits before a JSX
    // expression containing `>` (e.g. an inline handler).
    const text = `<button
  className="b3"
  onClick={() => state.go()}
>
  click
</button>`;
    const hints = extractHints(text);
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('b3');
    expect(hints[0].tagName).toBe('button');
  });

  it('handles real-world input with classNames + arrow + generic', () => {
    // A multi-line self-closing <input /> nested inside a paired tag, with a
    // multi-line classNames() value AND an onChange arrow handler whose
    // signature contains both a generic type and `=>`.
    const text = `<section className="outer">
  <input
    ref={ref}
    disabled={state.locked}
    className={classNames(
      base,
      styles.field,
      { [keyOf(styles.modA)]: state.locked },
      { [keyOf(styles.modB)]: !!state.getError("amount") },
    )}
    inputMode="decimal"
    value={value}
    onChange={(e: ChangeEvent<HTMLInputElement>): void => {
      state.start();
      if (state.getError("amount")) {
        state.clearError("amount");
      }
    }}
  />
</section>`;
    const hints = extractHints(text, {
      transformPatterns: [
        { pattern: '^classNames\\((.*)\\)$', replacement: '$1', flags: 's' },
        { pattern: 'styles\\.', replacement: '', flags: 'g' },
      ],
    });
    expect(hints).toHaveLength(2);
    // Inner <input /> first (closing position is earlier in document).
    expect(hints[0].tagName).toBe('input');
    expect(hints[0].value).not.toMatch(/\n/);
    expect(hints[0].value).toContain('field');
    expect(hints[0].value).toContain('"amount"');
    // Outer </section> still resolves correctly — the masking didn't break paired-tag matching.
    expect(hints[1].tagName).toBe('section');
    expect(hints[1].value).toBe('outer');
  });

  it('handles complex nested scenario', () => {
    const text = `<div className="outer">
  <span className="inner">
    <img className="icon" />
    hello
  </span>
</div>`;
    const hints = extractHints(text);
    expect(hints).toHaveLength(2);
    expect(hints[0].value).toBe('inner');
    expect(hints[0].tagName).toBe('span');
    expect(hints[1].value).toBe('outer');
    expect(hints[1].tagName).toBe('div');
  });

  it('handles HTML class attribute', () => {
    const text = '<div class="container">hello</div>';
    const hints = extractHints(text, { showSameLine: true });
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('container');
  });

  it('handles JSX expression values', () => {
    const text = '<div className={styles.wrapper}>hello</div>';
    const hints = extractHints(text, { showSameLine: true });
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('styles.wrapper');
  });

  it('returns empty array for text with no className/class tags', () => {
    const text = '<div id="test">hello</div>';
    const hints = extractHints(text, { showSameLine: true });
    expect(hints).toHaveLength(0);
  });

  it('handles fragments - inner tags work correctly', () => {
    const text = `<>
  <div className="inside-fragment">hello</div>
</>`;
    const hints = extractHints(text, { showSameLine: true });
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('inside-fragment');
  });

  it('handles multiple same-level elements', () => {
    const text = `<div className="a">hello</div>
<div className="b">world</div>`;
    const hints = extractHints(text, { showSameLine: true });
    expect(hints).toHaveLength(2);
    expect(hints[0].value).toBe('a');
    expect(hints[1].value).toBe('b');
  });
});

// ─── extractHints with transformPatterns ─────────────────────────────

describe('extractHints with transformPatterns', () => {
  it('applies transforms to hint values', () => {
    const text = '<div className={styles.container}>hello</div>';
    const transforms = [{ pattern: 'styles\\.', replacement: '', flags: 'g' }];
    const hints = extractHints(text, {
      transformPatterns: transforms,
      showSameLine: true,
    });
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('container');
  });

  it('empty transforms produces same behavior as no transforms', () => {
    const text = '<div className={styles.container}>hello</div>';
    const withEmpty = extractHints(text, {
      transformPatterns: [],
      showSameLine: true,
    });
    const withDefault = extractHints(text, { showSameLine: true });
    expect(withEmpty).toEqual(withDefault);
  });

  it('transforms run before truncation', () => {
    const text = '<div className={styles.aVeryLongClassName}>hello</div>';
    const transforms = [{ pattern: 'styles\\.', replacement: '', flags: 'g' }];
    const hints = extractHints(text, {
      maxLength: 10,
      transformPatterns: transforms,
      showSameLine: true,
    });
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('aVeryLongC...');
  });

  it('transforms + truncation interaction: short value after transform avoids truncation', () => {
    const text = '<div className={styles.box}>hello</div>';
    const transforms = [{ pattern: 'styles\\.', replacement: '', flags: 'g' }];
    const hints = extractHints(text, {
      maxLength: 10,
      transformPatterns: transforms,
      showSameLine: true,
    });
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('box');
  });
});

// ─── extractHints showSameLine filter ────────────────────────────────

describe('extractHints showSameLine filter', () => {
  it('hides hint when opening and closing tags are on the same line by default', () => {
    const text = '<div className="container">hello</div>';
    const hints = extractHints(text);
    expect(hints).toHaveLength(0);
  });

  it('shows hint for same-line tags when showSameLine is true', () => {
    const text = '<div className="container">hello</div>';
    const hints = extractHints(text, { showSameLine: true });
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('container');
  });

  it('shows hint for multi-line tags by default', () => {
    const text = `<div className="outer">
  hello
</div>`;
    const hints = extractHints(text);
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('outer');
  });

  it('hides hint when multi-line opening tag ends on same line as closing tag', () => {
    const text = `<div
  className="foo"
>hello</div>`;
    const hints = extractHints(text);
    expect(hints).toHaveLength(0);
  });

  it('shows hint when multi-line opening tag ends on different line from closing tag', () => {
    const text = `<div
  className="foo">
hello
</div>`;
    const hints = extractHints(text);
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('foo');
  });

  it('hides nested same-line tags by default', () => {
    const text = '<div className="a"><div className="b">x</div></div>';
    const hints = extractHints(text);
    expect(hints).toHaveLength(0);
  });

  it('shows nested same-line tags when showSameLine is true', () => {
    const text = '<div className="a"><div className="b">x</div></div>';
    const hints = extractHints(text, { showSameLine: true });
    expect(hints).toHaveLength(2);
  });

  it('mixed same-line and multi-line: only multi-line shown by default', () => {
    const text = `<div className="outer">
  <span className="inner">x</span>
</div>`;
    const hints = extractHints(text);
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('outer');
  });
});

// ─── whitespace normalization in extracted hints ────────────────────

describe('extractHints — whitespace normalization', () => {
  it('normalizes whitespace in multi-line cn() expressions', () => {
    const text =
      "<section className={cn('base', {\n  highlight: isActive,\n})}>x</section>";
    const hints = extractHints(text, {
      transformPatterns: [
        { pattern: '^cn\\((.*)\\)$', replacement: '$1', flags: 's' },
      ],
      showSameLine: true,
    });
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe("'base', { highlight: isActive, }");
    expect(hints[0].value).not.toMatch(/\n/);
  });

  it('normalizes whitespace even when no transformPatterns are supplied', () => {
    const text = '<div className={`flex\n  items-center\n  gap-2`}>x</div>';
    const hints = extractHints(text, { showSameLine: true });
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('flex items-center gap-2');
  });

  it('collapses internal newlines for plain object expressions', () => {
    const text = '<div className={{\n  foo: true,\n  bar: false,\n}}>x</div>';
    const hints = extractHints(text, { showSameLine: true });
    expect(hints).toHaveLength(1);
    expect(hints[0].value).not.toMatch(/\n/);
  });
});
