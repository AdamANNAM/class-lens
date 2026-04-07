import * as vscode from 'vscode';
import { extractHints } from './parser.js';
import { getConfig, isLanguageSupported } from './configuration.js';

export class ClassNameInlayHintsProvider implements vscode.InlayHintsProvider {
  private _onDidChangeInlayHints = new vscode.EventEmitter<void>();
  readonly onDidChangeInlayHints = this._onDidChangeInlayHints.event;

  refresh() {
    this._onDidChangeInlayHints.fire();
  }

  provideInlayHints(
    document: vscode.TextDocument,
    range: vscode.Range,
    _token: vscode.CancellationToken
  ) {
    const config = getConfig();

    if (!config.enabled || !isLanguageSupported(document.languageId)) {
      return [];
    }

    const text = document.getText();
    const hints = extractHints(text, config.maxLength, config.truncateType, config.truncatePosition, config.transformPatterns);

    return hints
      .filter((hint) => {
        const line = hint.closingTagEnd.line;
        return line >= range.start.line && line <= range.end.line;
      })
      .map((hint) => {
        const pos = new vscode.Position(
          hint.closingTagEnd.line,
          hint.closingTagEnd.character + 1
        );

        const label = `${config.prefix}${hint.value}`;
        const inlayHint = new vscode.InlayHint(pos, label);
        inlayHint.paddingLeft = true;

        return inlayHint;
      });
  }

  dispose() {
    this._onDidChangeInlayHints.dispose();
  }
}
