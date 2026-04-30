import {
  DecorationOptions,
  DecorationRangeBehavior,
  Position,
  Range,
  TextEditor,
  TextEditorDecorationType,
  ThemeColor,
  window,
} from 'vscode';
import type { ClassLensConfig, HintData } from './types.js';

let decorationType: TextEditorDecorationType | undefined;

export const createDecorationType = () => {
  decorationType?.dispose();

  decorationType = window.createTextEditorDecorationType({
    after: {
      color: new ThemeColor('editorCodeLens.foreground'),
      fontStyle: 'italic',
      margin: '0 1em',
    },
    rangeBehavior: DecorationRangeBehavior.ClosedClosed,
  });

  return decorationType;
};

export const buildDecorations = (
  hints: HintData[],
  config: ClassLensConfig,
): DecorationOptions[] =>
  hints.map((hint) => {
    const pos = new Position(
      hint.closingTagEnd.line,
      hint.closingTagEnd.character + 1,
    );

    return {
      range: new Range(pos, pos),
      renderOptions: {
        after: {
          contentText: [config.prefix.trim(), hint.value, config.suffix.trim()]
            .filter(Boolean)
            .join(' '),
          fontStyle: 'italic',
          opacity: config.opacity,
        },
      },
    };
  });

export const applyDecorations = (
  editor: TextEditor,
  hints: HintData[],
  config: ClassLensConfig,
  type: TextEditorDecorationType,
) => {
  const decorations = buildDecorations(hints, config);
  editor.setDecorations(type, decorations);
};

export const clearDecorations = (
  editor: TextEditor,
  type: TextEditorDecorationType,
) => {
  editor.setDecorations(type, []);
};

export const disposeDecorationType = () => {
  decorationType?.dispose();
  decorationType = undefined;
};
