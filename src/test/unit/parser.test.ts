import { describe, it, expect } from 'vitest';
import {
  extractClassValue,
  offsetToPosition,
  truncateValue,
  findOpeningTagsWithClass,
  matchClosingTags,
  extractHints,
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

  // ─── character + start ──────────────────────────────────────────────
  it('character+start: keeps the end of the value', () => {
    expect(truncateValue('flex items-center justify-between gap-4', 21, 'character', 'start'))
      .toBe('...justify-between gap-4');
  });

  it('character+start: returns unchanged when within maxLength', () => {
    expect(truncateValue('short', 10, 'character', 'start')).toBe('short');
  });

  // ─── word + end ─────────────────────────────────────────────────────
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

  // ─── word + start ──────────────────────────────────────────────────
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

// ─── findOpeningTagsWithClass ────────────────────────────────────────

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

  it('does not match className inside code strings or comments', () => {
    // A tag without className should not appear
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

// ─── matchClosingTags ────────────────────────────────────────────────

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
    // Inner div closes first
    expect(hints[0].value).toBe('inner');
    // Outer div closes second
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
    // The outer div has no className, but the inner span does
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

// ─── Tailwind CSS scenarios ──────────────────────────────────────────

describe('Tailwind CSS class names', () => {
  it('handles a long Tailwind utility string', () => {
    const tw = 'flex items-center justify-between gap-4 rounded-lg bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200';
    const text = `<div className="${tw}">content</div>`;
    const hints = extractHints(text);
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe(tw);
  });

  it('truncates a long Tailwind string with maxLength', () => {
    const tw = 'flex items-center justify-between gap-4 rounded-lg bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200';
    const text = `<div className="${tw}">content</div>`;
    const hints = extractHints(text, 30);
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe('flex items-center justify-betw...');
  });

  it('handles Tailwind with responsive and state prefixes', () => {
    const tw = 'w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5 hover:bg-blue-500 focus:ring-2 focus:ring-blue-300 dark:bg-gray-800 dark:text-white';
    const text = `<section className="${tw}">content</section>`;
    const hints = extractHints(text);
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe(tw);
  });

  it('handles Tailwind with arbitrary values in brackets', () => {
    const tw = 'grid grid-cols-[1fr_2fr_1fr] gap-[calc(1rem+4px)] bg-[#1a1a2e] text-[length:var(--size)]';
    const text = `<div className="${tw}">content</div>`;
    const hints = extractHints(text);
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toBe(tw);
  });

  it('handles clsx/cn with Tailwind classes', () => {
    const text = `<div className={cn(
      'flex items-center gap-2 rounded-md px-4 py-2',
      isActive && 'bg-blue-500 text-white',
      isDisabled && 'opacity-50 cursor-not-allowed'
    )}>content</div>`;
    const hints = extractHints(text);
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toContain('cn(');
    expect(hints[0].value).toContain('flex items-center');
  });

  it('handles Tailwind in a template literal with interpolation', () => {
    const text = '<div className={`flex items-center ${isActive ? "bg-blue-500" : "bg-gray-200"} rounded-lg p-4`}>content</div>';
    const hints = extractHints(text);
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toContain('flex items-center');
    expect(hints[0].value).toContain('rounded-lg p-4');
  });

  it('handles a realistic nested Tailwind component', () => {
    const text = `<div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
  <nav className="sticky top-0 z-50 flex items-center justify-between border-b bg-white/80 px-6 py-3 backdrop-blur-sm">
    <ul className="flex items-center gap-6 text-sm font-medium text-slate-600">
      <li className="hover:text-slate-900 transition-colors">Home</li>
    </ul>
  </nav>
</div>`;
    const hints = extractHints(text);
    expect(hints).toHaveLength(4);
    expect(hints[0].value).toBe('hover:text-slate-900 transition-colors');
    expect(hints[1].value).toBe('flex items-center gap-6 text-sm font-medium text-slate-600');
    expect(hints[2].value).toBe('sticky top-0 z-50 flex items-center justify-between border-b bg-white/80 px-6 py-3 backdrop-blur-sm');
    expect(hints[3].value).toBe('min-h-screen bg-gradient-to-br from-slate-50 to-slate-100');
  });

  it('handles multiline className attribute with Tailwind', () => {
    const text = `<button
  className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
>
  Submit
</button>`;
    const hints = extractHints(text);
    expect(hints).toHaveLength(1);
    expect(hints[0].value).toContain('inline-flex items-center');
    expect(hints[0].value).toContain('focus-visible:outline-blue-600');
  });
});
