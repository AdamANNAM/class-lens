import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Position, Range, window } from './__mocks__/vscode.js';
import { buildDecorations, createDecorationType, clearDecorations, disposeDecorationType } from '../../decorationProvider.js';
import { HintData, ClassNamePreviewConfig } from '../../types.js';

function makeConfig(overrides: Partial<ClassNamePreviewConfig> = {}): ClassNamePreviewConfig {
  return {
    enabled: true,
    renderMode: 'decoration',
    maxLength: 0,
    truncateType: 'character',
    truncatePosition: 'end',
    fontStyle: 'italic',
    opacity: '0.6',
    prefix: '// ',
    excludedLanguages: [],
    ...overrides,
  };
}

function makeMockDocument(): any {
  return {
    getText: vi.fn(() => ''),
    lineCount: 10,
    uri: { fsPath: '/test.tsx' },
  };
}

describe('decorationProvider', () => {
  describe('buildDecorations', () => {
    it('returns empty array for no hints', () => {
      const result = buildDecorations([], makeMockDocument(), makeConfig());
      expect(result).toEqual([]);
    });

    it('maps a single hint to a decoration with correct position', () => {
      const hints: HintData[] = [
        { value: 'container', closingTagEnd: { line: 2, character: 5 }, tagName: 'div' },
      ];

      const result = buildDecorations(hints, makeMockDocument(), makeConfig());

      expect(result).toHaveLength(1);
      const dec = result[0];
      // Position should be character + 1 (after the '>')
      expect(dec.range.start).toBeInstanceOf(Position);
      expect(dec.range.start.line).toBe(2);
      expect(dec.range.start.character).toBe(6);
    });

    it('sets correct contentText with prefix', () => {
      const hints: HintData[] = [
        { value: 'foo bar', closingTagEnd: { line: 0, character: 10 }, tagName: 'div' },
      ];

      const result = buildDecorations(hints, makeMockDocument(), makeConfig({ prefix: '// ' }));

      expect(result[0].renderOptions?.after?.contentText).toBe('// foo bar');
    });

    it('uses custom prefix', () => {
      const hints: HintData[] = [
        { value: 'test', closingTagEnd: { line: 0, character: 5 }, tagName: 'div' },
      ];

      const result = buildDecorations(hints, makeMockDocument(), makeConfig({ prefix: '/* ' }));

      expect(result[0].renderOptions?.after?.contentText).toBe('/* test');
    });

    it('applies fontStyle from config', () => {
      const hints: HintData[] = [
        { value: 'test', closingTagEnd: { line: 0, character: 5 }, tagName: 'div' },
      ];

      const result = buildDecorations(hints, makeMockDocument(), makeConfig({ fontStyle: 'normal' }));

      expect(result[0].renderOptions?.after?.fontStyle).toBe('normal');
    });

    it('applies opacity from config', () => {
      const hints: HintData[] = [
        { value: 'test', closingTagEnd: { line: 0, character: 5 }, tagName: 'div' },
      ];

      const result = buildDecorations(hints, makeMockDocument(), makeConfig({ opacity: '0.3' }));

      expect((result[0].renderOptions?.after as any)?.opacity).toBe('0.3');
    });

    it('maps multiple hints to multiple decorations', () => {
      const hints: HintData[] = [
        { value: 'first', closingTagEnd: { line: 1, character: 5 }, tagName: 'div' },
        { value: 'second', closingTagEnd: { line: 3, character: 10 }, tagName: 'span' },
        { value: 'third', closingTagEnd: { line: 7, character: 2 }, tagName: 'p' },
      ];

      const result = buildDecorations(hints, makeMockDocument(), makeConfig());

      expect(result).toHaveLength(3);
      expect(result[0].renderOptions?.after?.contentText).toBe('// first');
      expect(result[1].renderOptions?.after?.contentText).toBe('// second');
      expect(result[2].renderOptions?.after?.contentText).toBe('// third');
    });

    it('creates zero-width range (start === end) for each decoration', () => {
      const hints: HintData[] = [
        { value: 'test', closingTagEnd: { line: 4, character: 8 }, tagName: 'div' },
      ];

      const result = buildDecorations(hints, makeMockDocument(), makeConfig());
      const range = result[0].range;

      expect(range.start.line).toBe(range.end.line);
      expect(range.start.character).toBe(range.end.character);
    });
  });

  describe('createDecorationType', () => {
    it('calls window.createTextEditorDecorationType', () => {
      (window.createTextEditorDecorationType as ReturnType<typeof vi.fn>).mockClear();
      createDecorationType(makeConfig());
      expect(window.createTextEditorDecorationType).toHaveBeenCalledOnce();
    });

    it('passes fontStyle from config', () => {
      (window.createTextEditorDecorationType as ReturnType<typeof vi.fn>).mockClear();
      createDecorationType(makeConfig({ fontStyle: 'normal' }));

      const arg = (window.createTextEditorDecorationType as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(arg.after.fontStyle).toBe('normal');
    });
  });

  describe('clearDecorations', () => {
    it('calls setDecorations with empty array', () => {
      const mockEditor = {
        setDecorations: vi.fn(),
        document: makeMockDocument(),
      } as any;
      const mockType = { dispose: vi.fn(), key: 'test' } as any;

      clearDecorations(mockEditor, mockType);
      expect(mockEditor.setDecorations).toHaveBeenCalledWith(mockType, []);
    });
  });
});
