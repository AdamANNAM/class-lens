import { describe, it, expect, beforeEach } from 'vitest';
import { Position, Range, _setMockConfig, _clearMockConfig } from './__mocks__/vscode.js';
import { ClassNameInlayHintsProvider } from '../../inlayHintProvider.js';

function makeMockDocument(text: string, languageId: string = 'typescriptreact'): any {
  return {
    getText: () => text,
    lineCount: text.split('\n').length,
    uri: { fsPath: '/test.tsx' },
    languageId,
  };
}

function makeRange(startLine: number, startChar: number, endLine: number, endChar: number): any {
  return new Range(
    new Position(startLine, startChar),
    new Position(endLine, endChar)
  );
}

const mockToken: any = { isCancellationRequested: false, onCancellationRequested: () => ({ dispose: () => {} }) };

describe('ClassNameInlayHintsProvider', () => {
  let provider: ClassNameInlayHintsProvider;

  beforeEach(() => {
    _clearMockConfig();
    provider = new ClassNameInlayHintsProvider();
  });

  it('returns hints for a simple JSX element', () => {
    const text = '<div className="container">hello</div>';
    const doc = makeMockDocument(text);
    const range = makeRange(0, 0, 0, text.length);

    const hints = provider.provideInlayHints(doc, range, mockToken);

    expect(hints).toHaveLength(1);
    expect(hints[0].label).toBe('// container');
    expect(hints[0].paddingLeft).toBe(true);
  });

  it('returns empty array when disabled', () => {
    _setMockConfig('classnamePreview', { enabled: false });

    const text = '<div className="container">hello</div>';
    const doc = makeMockDocument(text);
    const range = makeRange(0, 0, 0, text.length);

    const hints = provider.provideInlayHints(doc, range, mockToken);
    expect(hints).toHaveLength(0);
  });

  it('returns empty array when language is excluded', () => {
    _setMockConfig('classnamePreview', { excludedLanguages: ['python'] });

    const text = '<div className="container">hello</div>';
    const doc = makeMockDocument(text, 'python');
    const range = makeRange(0, 0, 0, text.length);

    const hints = provider.provideInlayHints(doc, range, mockToken);
    expect(hints).toHaveLength(0);
  });

  it('returns hints for a language not in the excludelist', () => {
    _setMockConfig('classnamePreview', { excludedLanguages: ['python'] });

    const text = '<div className="container">hello</div>';
    const doc = makeMockDocument(text, 'astro');
    const range = makeRange(0, 0, 0, text.length);

    const hints = provider.provideInlayHints(doc, range, mockToken);
    expect(hints).toHaveLength(1);
  });

  it('applies prefix from config', () => {
    _setMockConfig('classnamePreview', { prefix: '/* ' });

    const text = '<div className="test">hello</div>';
    const doc = makeMockDocument(text);
    const range = makeRange(0, 0, 0, text.length);

    const hints = provider.provideInlayHints(doc, range, mockToken);

    expect(hints).toHaveLength(1);
    expect(hints[0].label).toBe('/* test');
  });

  it('applies maxLength truncation from config', () => {
    _setMockConfig('classnamePreview', { maxLength: 5 });

    const text = '<div className="a-very-long-class-name">hello</div>';
    const doc = makeMockDocument(text);
    const range = makeRange(0, 0, 0, text.length);

    const hints = provider.provideInlayHints(doc, range, mockToken);

    expect(hints).toHaveLength(1);
    expect(hints[0].label).toBe('// a-ver...');
  });

  it('applies word+end truncation from config', () => {
    _setMockConfig('classnamePreview', { maxLength: 20, truncateType: 'word', truncatePosition: 'end' });

    const text = '<div className="flex items-center justify-between gap-4">hello</div>';
    const doc = makeMockDocument(text);
    const range = makeRange(0, 0, 0, text.length);

    const hints = provider.provideInlayHints(doc, range, mockToken);

    expect(hints).toHaveLength(1);
    expect(hints[0].label).toBe('// flex items-center...');
  });

  it('applies word+start truncation from config', () => {
    _setMockConfig('classnamePreview', { maxLength: 25, truncateType: 'word', truncatePosition: 'start' });

    const text = '<div className="flex items-center justify-between gap-4">hello</div>';
    const doc = makeMockDocument(text);
    const range = makeRange(0, 0, 0, text.length);

    const hints = provider.provideInlayHints(doc, range, mockToken);

    expect(hints).toHaveLength(1);
    expect(hints[0].label).toBe('// ...justify-between gap-4');
  });

  it('applies character+start truncation from config', () => {
    _setMockConfig('classnamePreview', { maxLength: 21, truncateType: 'character', truncatePosition: 'start' });

    const text = '<div className="flex items-center justify-between gap-4">hello</div>';
    const doc = makeMockDocument(text);
    const range = makeRange(0, 0, 0, text.length);

    const hints = provider.provideInlayHints(doc, range, mockToken);

    expect(hints).toHaveLength(1);
    expect(hints[0].label).toBe('// ...justify-between gap-4');
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
    expect(hints[0].label).toBe('// second');
  });

  it('returns multiple hints for multi-line content', () => {
    const text = `<div className="outer">
  <span className="inner">hello</span>
</div>`;
    const doc = makeMockDocument(text);
    const range = makeRange(0, 0, 3, 0);

    const hints = provider.provideInlayHints(doc, range, mockToken);

    expect(hints).toHaveLength(2);
    expect(hints[0].label).toBe('// inner');
    expect(hints[1].label).toBe('// outer');
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

  it('handles self-closing tags (no hints)', () => {
    const text = '<img className="hero" />';
    const doc = makeMockDocument(text);
    const range = makeRange(0, 0, 0, text.length);

    const hints = provider.provideInlayHints(doc, range, mockToken);
    expect(hints).toHaveLength(0);
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
