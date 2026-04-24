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
import type { ClassNamePreviewConfig, HintData } from './types.js';

let decorationType: TextEditorDecorationType | undefined;

export const createDecorationType = (config: ClassNamePreviewConfig) => {
  if (decorationType) {
    decorationType.dispose();
  }

  decorationType = window.createTextEditorDecorationType({
    after: {
      color: new ThemeColor('editorCodeLens.foreground'),
      fontStyle: config.fontStyle,
      margin: '0 0 0 1em',
    },
    rangeBehavior: DecorationRangeBehavior.ClosedClosed,
  });

  return decorationType;
};

export const buildDecorations = (
  hints: HintData[],
  config: ClassNamePreviewConfig,
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
          contentText: `${config.prefix}${hint.value}`,
          fontStyle: config.fontStyle,
          opacity: config.opacity,
        },
      },
    };
  });

export const applyDecorations = (
  editor: TextEditor,
  hints: HintData[],
  config: ClassNamePreviewConfig,
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
  if (decorationType) {
    decorationType.dispose();
    decorationType = undefined;
  }
};
