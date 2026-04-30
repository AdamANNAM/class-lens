import { describe, expect, it, vi } from 'vitest';
import {
  buildDecorations,
  clearDecorations,
  createDecorationType,
} from '../../decorationProvider.js';
import type { ClassLensConfig, HintData } from '../../types.js';
import { Position, window } from './__mocks__/vscode.js';

const makeConfig = (
  overrides: Partial<ClassLensConfig> = {},
): ClassLensConfig => ({
  enabled: true,
  renderMode: 'decoration',
  maxLength: 0,
  truncateType: 'character',
  truncatePosition: 'end',
  opacity: '0.9',
  prefix: '// ',
  suffix: '',
  ellipsis: '...',
  showSameLine: false,
  hideSelfClosing: false,
  excludedLanguages: [],
  transformPatterns: [],
  ...overrides,
});

describe('decorationProvider', () => {
  describe('buildDecorations', () => {
    it('returns empty array for no hints', () => {
      const result = buildDecorations([], makeConfig());
      expect(result).toEqual([]);
    });

    it('maps a single hint to a decoration with correct position', () => {
      const hints: HintData[] = [
        {
          value: 'container',
          closingTagEnd: { line: 2, character: 5 },
          openingTagEndLine: 0,
          tagName: 'div',
        },
      ];

      const result = buildDecorations(hints, makeConfig());

      expect(result).toHaveLength(1);
      const dec = result[0];
      expect(dec.range.start).toBeInstanceOf(Position);
      expect(dec.range.start.line).toBe(2);
      expect(dec.range.start.character).toBe(6);
    });

    it('sets correct contentText with prefix', () => {
      const hints: HintData[] = [
        {
          value: 'foo bar',
          closingTagEnd: { line: 0, character: 10 },
          openingTagEndLine: 0,
          tagName: 'div',
        },
      ];

      const result = buildDecorations(hints, makeConfig({ prefix: '// ' }));

      expect(result[0].renderOptions?.after?.contentText).toBe('// foo bar');
    });

    it('uses custom prefix', () => {
      const hints: HintData[] = [
        {
          value: 'test',
          closingTagEnd: { line: 0, character: 5 },
          openingTagEndLine: 0,
          tagName: 'div',
        },
      ];

      const result = buildDecorations(hints, makeConfig({ prefix: '/* ' }));

      expect(result[0].renderOptions?.after?.contentText).toBe('/* test');
    });

    it('appends suffix when set', () => {
      const hints: HintData[] = [
        {
          value: 'foo bar',
          closingTagEnd: { line: 0, character: 5 },
          openingTagEndLine: 0,
          tagName: 'div',
        },
      ];

      const result = buildDecorations(
        hints,
        makeConfig({ prefix: '/*', suffix: '*/' }),
      );

      expect(result[0].renderOptions?.after?.contentText).toBe('/* foo bar */');
    });

    it('inserts a single space even when prefix already has a trailing space', () => {
      const hints: HintData[] = [
        {
          value: 'foo bar',
          closingTagEnd: { line: 0, character: 5 },
          openingTagEndLine: 0,
          tagName: 'div',
        },
      ];

      const result = buildDecorations(
        hints,
        makeConfig({ prefix: '// ', suffix: '' }),
      );

      expect(result[0].renderOptions?.after?.contentText).toBe('// foo bar');
    });

    it('drops empty prefix and suffix from the join', () => {
      const hints: HintData[] = [
        {
          value: 'foo bar',
          closingTagEnd: { line: 0, character: 5 },
          openingTagEndLine: 0,
          tagName: 'div',
        },
      ];

      const result = buildDecorations(
        hints,
        makeConfig({ prefix: '', suffix: '' }),
      );

      expect(result[0].renderOptions?.after?.contentText).toBe('foo bar');
    });

    it('applies italic fontStyle to every decoration', () => {
      const hints: HintData[] = [
        {
          value: 'test',
          closingTagEnd: { line: 0, character: 5 },
          openingTagEndLine: 0,
          tagName: 'div',
        },
      ];

      const result = buildDecorations(hints, makeConfig());

      expect(result[0].renderOptions?.after?.fontStyle).toBe('italic');
    });

    it('applies opacity from config', () => {
      const hints: HintData[] = [
        {
          value: 'test',
          closingTagEnd: { line: 0, character: 5 },
          openingTagEndLine: 0,
          tagName: 'div',
        },
      ];

      const result = buildDecorations(hints, makeConfig({ opacity: '0.3' }));

      expect((result[0].renderOptions?.after as any)?.opacity).toBe('0.3');
    });

    it('maps multiple hints to multiple decorations', () => {
      const hints: HintData[] = [
        {
          value: 'first',
          closingTagEnd: { line: 1, character: 5 },
          openingTagEndLine: 0,
          tagName: 'div',
        },
        {
          value: 'second',
          closingTagEnd: { line: 3, character: 10 },
          openingTagEndLine: 2,
          tagName: 'span',
        },
        {
          value: 'third',
          closingTagEnd: { line: 7, character: 2 },
          openingTagEndLine: 5,
          tagName: 'p',
        },
      ];

      const result = buildDecorations(hints, makeConfig());

      expect(result).toHaveLength(3);
      expect(result[0].renderOptions?.after?.contentText).toBe('// first');
      expect(result[1].renderOptions?.after?.contentText).toBe('// second');
      expect(result[2].renderOptions?.after?.contentText).toBe('// third');
    });

    it('creates zero-width range (start === end) for each decoration', () => {
      const hints: HintData[] = [
        {
          value: 'test',
          closingTagEnd: { line: 4, character: 8 },
          openingTagEndLine: 2,
          tagName: 'div',
        },
      ];

      const result = buildDecorations(hints, makeConfig());
      const range = result[0].range;

      expect(range.start.line).toBe(range.end.line);
      expect(range.start.character).toBe(range.end.character);
    });
  });

  describe('createDecorationType', () => {
    it('calls window.createTextEditorDecorationType', () => {
      (
        window.createTextEditorDecorationType as ReturnType<typeof vi.fn>
      ).mockClear();
      createDecorationType();
      expect(window.createTextEditorDecorationType).toHaveBeenCalledOnce();
    });

    it('always creates the decoration type with italic fontStyle', () => {
      (
        window.createTextEditorDecorationType as ReturnType<typeof vi.fn>
      ).mockClear();
      createDecorationType();

      const arg = (
        window.createTextEditorDecorationType as ReturnType<typeof vi.fn>
      ).mock.calls[0][0];
      expect(arg.after.fontStyle).toBe('italic');
    });
  });

  describe('clearDecorations', () => {
    it('calls setDecorations with empty array', () => {
      const mockEditor = { setDecorations: vi.fn() } as any;
      const mockType = { dispose: vi.fn(), key: 'test' } as any;

      clearDecorations(mockEditor, mockType);
      expect(mockEditor.setDecorations).toHaveBeenCalledWith(mockType, []);
    });
  });
});
