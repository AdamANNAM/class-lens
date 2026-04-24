import { workspace } from 'vscode';
import type { ClassNamePreviewConfig, TransformPattern } from './types.js';

const SECTION = 'classnamePreview';

const DEFAULT_TRANSFORM_PATTERNS: TransformPattern[] = [
  { pattern: '^classNames\\((.*)\\)$', replacement: '$1', flags: 's' },
  { pattern: '^clsx\\((.*)\\)$', replacement: '$1', flags: 's' },
  { pattern: '^cx\\((.*)\\)$', replacement: '$1', flags: 's' },
  { pattern: '^cn\\((.*)\\)$', replacement: '$1', flags: 's' },
  { pattern: 'styles\\.', replacement: '', flags: 'g' },
  { pattern: '\\$style\\.', replacement: '', flags: 'g' },
  { pattern: '\\bclassName\\b\\s*,\\s*|,\\s*\\bclassName\\b|\\bclassName\\b', replacement: '', flags: 'g' },
];

export const getConfig = (): ClassNamePreviewConfig => {
  const config = workspace.getConfiguration(SECTION);

  const partialPatterns = config.get<Partial<TransformPattern>[]>(
    'transformPatterns',
    DEFAULT_TRANSFORM_PATTERNS,
  );

  const transformPatterns = partialPatterns.map(
    (it): TransformPattern => ({
      pattern: it.pattern ?? '',
      replacement: it.replacement ?? '',
      flags: it.flags ?? 'g',
    }),
  );

  return {
    enabled: config.get<boolean>('enabled', true),
    renderMode: config.get<'decoration' | 'inlayHint'>(
      'renderMode',
      'decoration',
    ),
    maxLength: config.get<number>('maxLength', 50),
    truncateType: config.get<'character' | 'word'>('truncateType', 'word'),
    truncatePosition: config.get<'end' | 'start'>('truncatePosition', 'end'),
    fontStyle: config.get<'italic' | 'normal'>('fontStyle', 'italic'),
    opacity: config.get<string>('opacity', '0.9'),
    prefix: config.get<string>('prefix', '// '),
    excludedLanguages: config.get<string[]>('excludedLanguages', []),
    transformPatterns,
  };
};

export const isLanguageSupported = (languageId: string) => {
  const config = getConfig();
  return !config.excludedLanguages.includes(languageId);
};
