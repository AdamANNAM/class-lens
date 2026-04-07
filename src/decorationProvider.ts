import * as vscode from 'vscode';
import type { HintData, ClassNamePreviewConfig } from './types.js';

let decorationType: vscode.TextEditorDecorationType | undefined;

export const createDecorationType = (config: ClassNamePreviewConfig) => {
  if (decorationType) {
    decorationType.dispose();
  }

  decorationType = vscode.window.createTextEditorDecorationType({
    after: {
      color: new vscode.ThemeColor('editorCodeLens.foreground'),
      fontStyle: config.fontStyle,
      margin: '0 0 0 1em',
    },
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
  });

  return decorationType;
};

export const buildDecorations = (
  hints: HintData[],
  config: ClassNamePreviewConfig
): vscode.DecorationOptions[] =>
  hints.map((hint) => {
    const pos = new vscode.Position(hint.closingTagEnd.line, hint.closingTagEnd.character + 1);
    const range = new vscode.Range(pos, pos);

    return {
      range,
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
  editor: vscode.TextEditor,
  hints: HintData[],
  config: ClassNamePreviewConfig,
  type: vscode.TextEditorDecorationType
) => {
  const decorations = buildDecorations(hints, config);
  editor.setDecorations(type, decorations);
};

export const clearDecorations = (
  editor: vscode.TextEditor,
  type: vscode.TextEditorDecorationType
) => {
  editor.setDecorations(type, []);
};

export const disposeDecorationType = () => {
  if (decorationType) {
    decorationType.dispose();
    decorationType = undefined;
  }
};
