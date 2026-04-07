import { describe, it, expect } from 'vitest';
import { extractHints } from '../../parser.js';

// ─── extractHints (integration of all parser functions) ──────────────

describe('extractHints', () => {
  it('returns hints for simple JSX', () => {
    const text = '<div className="container">hello</div>';
    const hints = extractHints(text);
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('container');
    expect(hints[0].tagName).toBe('div');
  });

  it('applies truncation when maxLength > 0', () => {
    const text = '<div className="a-very-long-class-name">hello</div>';
    const hints = extractHints(text, 10);
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('a-very-lon...');
  });

  it('applies character+start truncation', () => {
    const text = '<div className="flex items-center justify-between gap-4">hello</div>';
    const hints = extractHints(text, 21, 'character', 'start');
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('...justify-between gap-4');
  });

  it('applies word+end truncation', () => {
    const text = '<div className="flex items-center justify-between gap-4">hello</div>';
    const hints = extractHints(text, 20, 'word', 'end');
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('flex items-center...');
  });

  it('applies word+start truncation', () => {
    const text = '<div className="flex items-center justify-between gap-4">hello</div>';
    const hints = extractHints(text, 25, 'word', 'start');
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('...justify-between gap-4');
  });

  it('does not truncate when maxLength is 0', () => {
    const text = '<div className="a-very-long-class-name">hello</div>';
    const hints = extractHints(text);
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('a-very-long-class-name');
  });

  it('excludes self-closing tags from hints', () => {
    const text = '<img className="hero" />';
    const hints = extractHints(text);
    expect(hints).toHaveLength(0);
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
    const hints = extractHints(text);
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('container');
  });

  it('handles JSX expression values', () => {
    const text = '<div className={styles.wrapper}>hello</div>';
    const hints = extractHints(text);
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('styles.wrapper');
  });

  it('returns empty array for text with no className/class tags', () => {
    const text = '<div id="test">hello</div>';
    const hints = extractHints(text);
    expect(hints).toHaveLength(0);
  });

  it('handles fragments - inner tags work correctly', () => {
    const text = `<>
  <div className="inside-fragment">hello</div>
</>`;
    const hints = extractHints(text);
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('inside-fragment');
  });

  it('handles multiple same-level elements', () => {
    const text = `<div className="a">hello</div>
<div className="b">world</div>`;
    const hints = extractHints(text);
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
    const hints = extractHints(text, 0, 'character', 'end', transforms);
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('container');
  });

  it('empty transforms produces same behavior as no transforms', () => {
    const text = '<div className={styles.container}>hello</div>';
    const withEmpty = extractHints(text, 0, 'character', 'end', []);
    const withDefault = extractHints(text);
    expect(withEmpty).toEqual(withDefault);
  });

  it('transforms run before truncation', () => {
    const text = '<div className={styles.aVeryLongClassName}>hello</div>';
    const transforms = [{ pattern: 'styles\\.', replacement: '', flags: 'g' }];
    const hints = extractHints(text, 10, 'character', 'end', transforms);
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('aVeryLongC...');
  });

  it('transforms + truncation interaction: short value after transform avoids truncation', () => {
    const text = '<div className={styles.box}>hello</div>';
    const transforms = [{ pattern: 'styles\\.', replacement: '', flags: 'g' }];
    const hints = extractHints(text, 10, 'character', 'end', transforms);
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('box');
  });
});

