import * as vscode from 'vscode';
import { HintData, ClassNamePreviewConfig } from './types.js';

let decorationType: vscode.TextEditorDecorationType | undefined;

export function createDecorationType(config: ClassNamePreviewConfig): vscode.TextEditorDecorationType {
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
}

export function buildDecorations(
  hints: HintData[],
  document: vscode.TextDocument,
  config: ClassNamePreviewConfig
): vscode.DecorationOptions[] {
  return hints.map((hint) => {
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
}

export function applyDecorations(
  editor: vscode.TextEditor,
  hints: HintData[],
  config: ClassNamePreviewConfig,
  type: vscode.TextEditorDecorationType
): void {
  const decorations = buildDecorations(hints, editor.document, config);
  editor.setDecorations(type, decorations);
}

export function clearDecorations(editor: vscode.TextEditor, type: vscode.TextEditorDecorationType): void {
  editor.setDecorations(type, []);
}

export function disposeDecorationType(): void {
  if (decorationType) {
    decorationType.dispose();
    decorationType = undefined;
  }
}
