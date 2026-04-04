import * as vscode from 'vscode';
import { ClassNamePreviewConfig } from './types.js';

const SECTION = 'classnamePreview';

export function getConfig(): ClassNamePreviewConfig {
  const config = vscode.workspace.getConfiguration(SECTION);

  return {
    enabled: config.get<boolean>('enabled', true),
    renderMode: config.get<'decoration' | 'inlayHint'>('renderMode', 'decoration'),
    maxLength: config.get<number>('maxLength', 0),
    truncateType: config.get<'character' | 'word'>('truncateType', 'character'),
    truncatePosition: config.get<'end' | 'start'>('truncatePosition', 'end'),
    fontStyle: config.get<'italic' | 'normal'>('fontStyle', 'italic'),
    opacity: config.get<string>('opacity', '0.6'),
    prefix: config.get<string>('prefix', '// '),
    excludedLanguages: config.get<string[]>('excludedLanguages', []),
  };
}

export function isLanguageSupported(languageId: string): boolean {
  const config = getConfig();
  return !config.excludedLanguages.includes(languageId);
}
