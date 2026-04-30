import {
  CancellationToken,
  EventEmitter,
  InlayHint,
  InlayHintsProvider,
  Position,
  Range,
  TextDocument,
} from 'vscode';
import { getConfig, isLanguageSupported } from './configuration.js';
import { extractHints } from './parser.js';

export class ClassNameInlayHintsProvider implements InlayHintsProvider {
  private _onDidChangeInlayHints = new EventEmitter<void>();
  readonly onDidChangeInlayHints = this._onDidChangeInlayHints.event;

  refresh() {
    this._onDidChangeInlayHints.fire();
  }

  provideInlayHints(
    document: TextDocument,
    range: Range,
    _token: CancellationToken,
  ) {
    const config = getConfig();

    if (!config.enabled || !isLanguageSupported(document.languageId)) {
      return [];
    }

    const text = document.getText();
    const hints = extractHints(text, {
      maxLength: config.maxLength,
      truncateType: config.truncateType,
      truncatePosition: config.truncatePosition,
      ellipsis: config.ellipsis,
      transformPatterns: config.transformPatterns,
      showSameLine: config.showSameLine,
      hideSelfClosing: config.hideSelfClosing,
    });

    return hints
      .filter((hint) => {
        const line = hint.closingTagEnd.line;
        return line >= range.start.line && line <= range.end.line;
      })
      .map((hint) => {
        const pos = new Position(
          hint.closingTagEnd.line,
          hint.closingTagEnd.character + 1,
        );

        const label = [config.prefix.trim(), hint.value, config.suffix.trim()]
          .filter(Boolean)
          .join(' ');
        const inlayHint = new InlayHint(pos, label);
        inlayHint.paddingLeft = true;

        return inlayHint;
      });
  }

  dispose() {
    this._onDidChangeInlayHints.dispose();
  }
}
