import { describe, it, expect } from 'vitest';
import { findOpeningTagsWithClass } from '../../parser.js';
import { matchClosingTags, buildTagMatchRegex } from '../../tagMatcher.js';

describe('findOpeningTagsWithClass', () => {
  it('finds a simple className with double quotes', () => {
    const text = '<div className="foo bar">hello</div>';
    const result = findOpeningTagsWithClass(text);
    expect(result).toHaveLength(1);
    expect(result[0].tagName).toBe('div');
    expect(result[0].classValue).toBe('foo bar');
    expect(result[0].selfClosing).toBe(false);
  });

  it('finds a simple className with single quotes', () => {
    const text = "<div className='foo bar'>hello</div>";
    const result = findOpeningTagsWithClass(text);
    expect(result).toHaveLength(1);
    expect(result[0].classValue).toBe('foo bar');
  });

  it('finds a className with JSX expression {styles.container}', () => {
    const text = '<div className={styles.container}>hello</div>';
    const result = findOpeningTagsWithClass(text);
    expect(result).toHaveLength(1);
    expect(result[0].classValue).toBe('styles.container');
  });

  it('finds a className with nested braces in JSX expression', () => {
    const text = "<div className={cn('a', { b: c })}>hello</div>";
    const result = findOpeningTagsWithClass(text);
    expect(result).toHaveLength(1);
    expect(result[0].classValue).toBe("cn('a', { b: c })");
  });

  it('finds a className with template literal', () => {
    const text = '<div className={`foo ${bar}`}>hello</div>';
    const result = findOpeningTagsWithClass(text);
    expect(result).toHaveLength(1);
    expect(result[0].classValue).toBe('foo ${bar}');
  });

  it('excludes self-closing tags', () => {
    const text = '<img className="hero" />';
    const result = findOpeningTagsWithClass(text);
    expect(result).toHaveLength(1);
    expect(result[0].selfClosing).toBe(true);
  });

  it('finds HTML class attribute', () => {
    const text = '<div class="foo bar">hello</div>';
    const result = findOpeningTagsWithClass(text);
    expect(result).toHaveLength(1);
    expect(result[0].tagName).toBe('div');
    expect(result[0].classValue).toBe('foo bar');
  });

  it('handles PascalCase component names', () => {
    const text = '<MyComponent className="wrapper">hello</MyComponent>';
    const result = findOpeningTagsWithClass(text);
    expect(result).toHaveLength(1);
    expect(result[0].tagName).toBe('MyComponent');
  });

  it('handles dotted component names', () => {
    const text = '<Motion.div className="animated">hello</Motion.div>';
    const result = findOpeningTagsWithClass(text);
    expect(result).toHaveLength(1);
    expect(result[0].tagName).toBe('Motion.div');
  });

  it('handles multiline tags', () => {
    const text = `<div
  className="foo bar"
  id="test"
>
  hello
</div>`;
    const result = findOpeningTagsWithClass(text);
    expect(result).toHaveLength(1);
    expect(result[0].classValue).toBe('foo bar');
  });

  it('finds multiple tags', () => {
    const text = '<div className="a">hello</div><span className="b">world</span>';
    const result = findOpeningTagsWithClass(text);
    expect(result).toHaveLength(2);
    expect(result[0].classValue).toBe('a');
    expect(result[1].classValue).toBe('b');
  });

  it('does not match tags without className', () => {
    const text = '<div id="test">hello</div>';
    const result = findOpeningTagsWithClass(text);
    expect(result).toHaveLength(0);
  });

  it('handles ternary in JSX expression', () => {
    const text = "<div className={isActive ? 'active' : 'inactive'}>hello</div>";
    const result = findOpeningTagsWithClass(text);
    expect(result).toHaveLength(1);
    expect(result[0].classValue).toBe("isActive ? 'active' : 'inactive'");
  });

  it('finds self-closing tags with />', () => {
    const text = '<br className="spacer"/>';
    const result = findOpeningTagsWithClass(text);
    expect(result).toHaveLength(1);
    expect(result[0].selfClosing).toBe(true);
  });

  it('finds self-closing tags with space before />', () => {
    const text = '<input className="field" />';
    const result = findOpeningTagsWithClass(text);
    expect(result).toHaveLength(1);
    expect(result[0].selfClosing).toBe(true);
  });
});

describe('matchClosingTags', () => {
  it('matches a simple opening/closing pair', () => {
    const text = '<div className="foo">hello</div>';
    const openingTags = findOpeningTagsWithClass(text);
    const hints = matchClosingTags(text, openingTags);
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('foo');
    expect(hints[0].tagName).toBe('div');
    expect(hints[0].closingTagEnd.line).toBe(0);
  });

  it('matches nested same-name tags correctly', () => {
    const text = '<div className="outer"><div className="inner">hello</div></div>';
    const openingTags = findOpeningTagsWithClass(text);
    const hints = matchClosingTags(text, openingTags);
    expect(hints).toHaveLength(2);
    expect(hints[0].value).toBe('inner');
    expect(hints[1].value).toBe('outer');
  });

  it('handles interleaved different tag names', () => {
    const text = '<div className="d"><span className="s">hello</span></div>';
    const openingTags = findOpeningTagsWithClass(text);
    const hints = matchClosingTags(text, openingTags);
    expect(hints).toHaveLength(2);
    expect(hints[0].value).toBe('s');
    expect(hints[0].tagName).toBe('span');
    expect(hints[1].value).toBe('d');
    expect(hints[1].tagName).toBe('div');
  });

  it('skips self-closing tags (no closing tag consumed)', () => {
    const text = '<img className="hero" /><div className="wrap">hello</div>';
    const openingTags = findOpeningTagsWithClass(text);
    const nonSelfClosing = openingTags.filter((t) => !t.selfClosing);
    const hints = matchClosingTags(text, nonSelfClosing);
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('wrap');
  });

  it('handles tags without className mixed in', () => {
    const text = '<div><span className="highlight">hello</span></div>';
    const openingTags = findOpeningTagsWithClass(text);
    const hints = matchClosingTags(text, openingTags);
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('highlight');
    expect(hints[0].tagName).toBe('span');
  });

  it('provides correct multi-line closing tag position', () => {
    const text = `<div className="foo">
  hello
</div>`;
    const openingTags = findOpeningTagsWithClass(text);
    const hints = matchClosingTags(text, openingTags);
    expect(hints).toHaveLength(1);
    expect(hints[0].closingTagEnd.line).toBe(2);
  });
});

describe('buildTagMatchRegex', () => {
  it.each([
    ['div', '<div>', 1, 'opening'],
    ['div', '<div className="a">', 1, 'opening with attrs'],
    ['div', '</div>', 3, 'closing'],
    ['div', '<div />', 1, 'self-closing (matched by opening alt)'],
    ['div', '<span>', undefined, 'non-matching tag'],
    ['Motion.div', '<Motion.div className="a">', 1, 'dotted opening'],
    ['Motion.div', '</Motion.div>', 3, 'dotted closing'],
  ])('tagName=%s input=%s → group %s (%s)', (tagName, input, expectedGroup, _label) => {
    const re = buildTagMatchRegex(tagName);
    const match = re.exec(input);
    if (expectedGroup === undefined) {
      expect(match).toBeNull();
    } else {
      expect(match).not.toBeNull();
      expect(match![expectedGroup]).toBe(tagName);
    }
  });
});
