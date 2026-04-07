import * as vscode from 'vscode';
import type { ClassNamePreviewConfig, TransformPattern } from './types.js';

const SECTION = 'classnamePreview';

export const getConfig = (): ClassNamePreviewConfig => {
  const config = vscode.workspace.getConfiguration(SECTION);

  const partialPatterns = config.get<Partial<TransformPattern>[]>(
    'transformPatterns',
    [],
  );

  const transformPatterns: TransformPattern[] = partialPatterns.map((it) => ({
    pattern: it.pattern ?? '',
    replacement: it.replacement ?? '',
    flags: it.flags ?? 'g',
  }));

  return {
    enabled: config.get<boolean>('enabled', true),
    renderMode: config.get<'decoration' | 'inlayHint'>(
      'renderMode',
      'decoration',
    ),
    maxLength: config.get<number>('maxLength', 0),
    truncateType: config.get<'character' | 'word'>('truncateType', 'character'),
    truncatePosition: config.get<'end' | 'start'>('truncatePosition', 'end'),
    fontStyle: config.get<'italic' | 'normal'>('fontStyle', 'italic'),
    opacity: config.get<string>('opacity', '0.6'),
    prefix: config.get<string>('prefix', '// '),
    excludedLanguages: config.get<string[]>('excludedLanguages', []),
    transformPatterns,
  };
};

export const isLanguageSupported = (languageId: string) => {
  const config = getConfig();
  return !config.excludedLanguages.includes(languageId);
};
