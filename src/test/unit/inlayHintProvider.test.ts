import { beforeEach, describe, expect, it } from 'vitest';
import type { TextDocument, Range as VSCRange } from 'vscode';
import { ClassNameInlayHintsProvider } from '../../inlayHintProvider.js';
import {
  Position,
  Range,
  _clearMockConfig,
  _setMockConfig,
} from './__mocks__/vscode.js';

const makeMockDocument = (
  text: string,
  languageId: string = 'typescriptreact',
) =>
  ({
    getText: () => text,
    lineCount: text.split('\n').length,
    uri: { fsPath: '/test.tsx' },
    languageId,
  }) as unknown as TextDocument;

const makeRange = (
  startLine: number,
  startChar: number,
  endLine: number,
  endChar: number,
) =>
  new Range(
    new Position(startLine, startChar),
    new Position(endLine, endChar),
  ) as VSCRange;

const mockToken = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose: () => {} }),
};

describe('ClassNameInlayHintsProvider', () => {
  let provider: ClassNameInlayHintsProvider;

  beforeEach(() => {
    _clearMockConfig();
    _setMockConfig('classLens', { showSameLine: true });
    provider = new ClassNameInlayHintsProvider();
  });

  it('returns hints for a simple JSX element', () => {
    const text = '<div className="container">hello</div>';
    const doc = makeMockDocument(text);
    const range = makeRange(0, 0, 0, text.length);

    const hints = provider.provideInlayHints(doc, range, mockToken);

    expect(hints).toHaveLength(1);
    expect(hints[0].label).toBe('/* container */');
    expect(hints[0].paddingLeft).toBe(true);
  });

  it('returns empty array when disabled', () => {
    _setMockConfig('classLens', { enabled: false });

    const text = '<div className="container">hello</div>';
    const doc = makeMockDocument(text);
    const range = makeRange(0, 0, 0, text.length);

    const hints = provider.provideInlayHints(doc, range, mockToken);
    expect(hints).toHaveLength(0);
  });

  it('returns empty array when language is excluded', () => {
    _setMockConfig('classLens', { excludedLanguages: ['python'] });

    const text = '<div className="container">hello</div>';
    const doc = makeMockDocument(text, 'python');
    const range = makeRange(0, 0, 0, text.length);

    const hints = provider.provideInlayHints(doc, range, mockToken);
    expect(hints).toHaveLength(0);
  });

  it('returns hints for a language not in the excludelist', () => {
    _setMockConfig('classLens', { excludedLanguages: ['python'] });

    const text = '<div className="container">hello</div>';
    const doc = makeMockDocument(text, 'astro');
    const range = makeRange(0, 0, 0, text.length);

    const hints = provider.provideInlayHints(doc, range, mockToken);
    expect(hints).toHaveLength(1);
  });

  it('applies prefix from config (auto-inserts space, ignores user trailing space)', () => {
    _setMockConfig('classLens', { prefix: '/* ', suffix: '' });

    const text = '<div className="test">hello</div>';
    const doc = makeMockDocument(text);
    const range = makeRange(0, 0, 0, text.length);

    const hints = provider.provideInlayHints(doc, range, mockToken);

    expect(hints).toHaveLength(1);
    expect(hints[0].label).toBe('/* test');
  });

  it('appends suffix when set', () => {
    _setMockConfig('classLens', { prefix: '/*', suffix: '*/' });

    const text = '<div className="test">hello</div>';
    const doc = makeMockDocument(text);
    const range = makeRange(0, 0, 0, text.length);

    const hints = provider.provideInlayHints(doc, range, mockToken);

    expect(hints).toHaveLength(1);
    expect(hints[0].label).toBe('/* test */');
  });

  it('applies maxLength truncation from config', () => {
    _setMockConfig('classLens', { maxLength: 5 });

    const text = '<div className="a-very-long-class-name">hello</div>';
    const doc = makeMockDocument(text);
    const range = makeRange(0, 0, 0, text.length);

    const hints = provider.provideInlayHints(doc, range, mockToken);

    expect(hints).toHaveLength(1);
    expect(hints[0].label).toBe('/* a-ver... */');
  });

  it.each([
    [
      { maxLength: 20, truncateType: 'word', truncatePosition: 'end' },
      '/* flex items-center... */',
    ],
    [
      { maxLength: 25, truncateType: 'word', truncatePosition: 'start' },
      '/* ...justify-between gap-4 */',
    ],
    [
      { maxLength: 21, truncateType: 'character', truncatePosition: 'start' },
      '/* ...justify-between gap-4 */',
    ],
  ])('applies truncation config %j', (configOverrides, expectedLabel) => {
    _setMockConfig('classLens', configOverrides);
    const text =
      '<div className="flex items-center justify-between gap-4">hello</div>';
    const doc = makeMockDocument(text);
    const range = makeRange(0, 0, 0, text.length);
    const hints = provider.provideInlayHints(doc, range, mockToken);
    expect(hints).toHaveLength(1);
    expect(hints[0].label).toBe(expectedLabel);
  });

  it('filters hints outside the requested range', () => {
    const text = `<div className="first">a</div>
<div className="second">b</div>
<div className="third">c</div>`;
    const doc = makeMockDocument(text);
    // Only request line 1
    const range = makeRange(1, 0, 1, 100);

    const hints = provider.provideInlayHints(doc, range, mockToken);

    expect(hints).toHaveLength(1);
    expect(hints[0].label).toBe('/* second */');
  });

  it('returns multiple hints for multi-line content', () => {
    const text = `<div className="outer">
  <span className="inner">hello</span>
</div>`;
    const doc = makeMockDocument(text);
    const range = makeRange(0, 0, 3, 0);

    const hints = provider.provideInlayHints(doc, range, mockToken);

    expect(hints).toHaveLength(2);
    expect(hints[0].label).toBe('/* inner */');
    expect(hints[1].label).toBe('/* outer */');
  });

  it('positions hints after the closing tag character', () => {
    const text = '<div className="foo">x</div>';
    const doc = makeMockDocument(text);
    const range = makeRange(0, 0, 0, text.length);

    const hints = provider.provideInlayHints(doc, range, mockToken);

    expect(hints).toHaveLength(1);
    // closing > of </div> is at position 27, so hint should be at 28
    expect(hints[0].position.line).toBe(0);
    expect(hints[0].position.character).toBe(28);
  });

  it('returns empty array for text without class attributes', () => {
    const text = '<div id="test">hello</div>';
    const doc = makeMockDocument(text);
    const range = makeRange(0, 0, 0, text.length);

    const hints = provider.provideInlayHints(doc, range, mockToken);
    expect(hints).toHaveLength(0);
  });

  it('shows hint for single-line self-closing tag when showSameLine is true', () => {
    const text = '<img className="hero" />';
    const doc = makeMockDocument(text);
    const range = makeRange(0, 0, 0, text.length);

    const hints = provider.provideInlayHints(doc, range, mockToken);
    expect(hints).toHaveLength(1);
    expect(hints[0].label).toBe('/* hero */');
  });

  it('suppresses self-closing tag hints when hideSelfClosing is true', () => {
    _setMockConfig('classLens', {
      showSameLine: true,
      hideSelfClosing: true,
    });
    const text = '<img className="hero" />';
    const doc = makeMockDocument(text);
    const range = makeRange(0, 0, 0, text.length);

    const hints = provider.provideInlayHints(doc, range, mockToken);
    expect(hints).toHaveLength(0);
  });

  describe('showSameLine', () => {
    it('hides hint for same-line tag by default (showSameLine omitted)', () => {
      _clearMockConfig();
      const text = '<div className="container">hello</div>';
      const doc = makeMockDocument(text);
      const range = makeRange(0, 0, 0, text.length);

      const hints = provider.provideInlayHints(doc, range, mockToken);
      expect(hints).toHaveLength(0);
    });

    it('shows hint for same-line tag when showSameLine is true', () => {
      _setMockConfig('classLens', { showSameLine: true });
      const text = '<div className="container">hello</div>';
      const doc = makeMockDocument(text);
      const range = makeRange(0, 0, 0, text.length);

      const hints = provider.provideInlayHints(doc, range, mockToken);
      expect(hints).toHaveLength(1);
      expect(hints[0].label).toBe('/* container */');
    });

    it('shows hint for multi-line tag regardless of showSameLine setting', () => {
      _clearMockConfig();
      const text = `<div className="outer">
  hello
</div>`;
      const doc = makeMockDocument(text);
      const range = makeRange(0, 0, 2, 10);

      const hints = provider.provideInlayHints(doc, range, mockToken);
      expect(hints).toHaveLength(1);
      expect(hints[0].label).toBe('/* outer */');
    });
  });

  describe('refresh', () => {
    it('fires the onDidChangeInlayHints event', () => {
      let fired = false;
      provider.onDidChangeInlayHints(() => {
        fired = true;
      });

      provider.refresh();
      expect(fired).toBe(true);
    });
  });

  describe('dispose', () => {
    it('can be called without error', () => {
      expect(() => provider.dispose()).not.toThrow();
    });
  });
});
