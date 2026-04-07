import { describe, it, expect } from 'vitest';
import { extractHints } from '../../parser.js';

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
