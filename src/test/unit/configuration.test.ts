import { beforeEach, describe, expect, it } from 'vitest';
import { getConfig, isLanguageSupported } from '../../configuration.js';
import { _clearMockConfig, _setMockConfig } from './__mocks__/vscode.js';

describe('configuration', () => {
  beforeEach(() => {
    _clearMockConfig();
  });

  describe('getConfig', () => {
    it('returns all default values when no config is set', () => {
      const config = getConfig();
      expect(config.enabled).toBe(true);
      expect(config.renderMode).toBe('decoration');
      expect(config.maxLength).toBe(40);
      expect(config.truncateType).toBe('word');
      expect(config.truncatePosition).toBe('end');
      expect(config.opacity).toBe('0.9');
      expect(config.prefix).toBe('/*');
      expect(config.suffix).toBe('*/');
      expect(config.ellipsis).toBe('...');
      expect(config.showSameLine).toBe(false);
      expect(config.excludedLanguages).toEqual([]);
      expect(config.transformPatterns).toHaveLength(7);
    });

    it('reads showSameLine override from config', () => {
      _setMockConfig('classLens', { showSameLine: true });
      const config = getConfig();
      expect(config.showSameLine).toBe(true);
    });

    it('returns overridden values from workspace config', () => {
      _setMockConfig('classLens', {
        enabled: false,
        renderMode: 'inlayHint',
        maxLength: 20,
        truncateType: 'word',
        truncatePosition: 'start',
        opacity: '0.4',
        prefix: '//',
        suffix: '',
        ellipsis: '…',
        excludedLanguages: ['python', 'rust'],
      });

      const config = getConfig();
      expect(config.enabled).toBe(false);
      expect(config.renderMode).toBe('inlayHint');
      expect(config.maxLength).toBe(20);
      expect(config.truncateType).toBe('word');
      expect(config.truncatePosition).toBe('start');
      expect(config.opacity).toBe('0.4');
      expect(config.prefix).toBe('//');
      expect(config.suffix).toBe('');
      expect(config.ellipsis).toBe('…');
      expect(config.excludedLanguages).toEqual(['python', 'rust']);
    });

    it('returns defaults for missing keys in partial config', () => {
      _setMockConfig('classLens', {
        enabled: false,
      });

      const config = getConfig();
      expect(config.enabled).toBe(false);
      expect(config.renderMode).toBe('decoration');
      expect(config.maxLength).toBe(40);
      expect(config.excludedLanguages).toEqual([]);
    });
  });

  describe('isLanguageSupported', () => {
    it('returns true for any language by default (empty excludelist)', () => {
      expect(isLanguageSupported('typescriptreact')).toBe(true);
      expect(isLanguageSupported('html')).toBe(true);
      expect(isLanguageSupported('python')).toBe(true);
      expect(isLanguageSupported('rust')).toBe(true);
      expect(isLanguageSupported('astro')).toBe(true);
    });

    it('returns false for excluded languages', () => {
      _setMockConfig('classLens', {
        excludedLanguages: ['python', 'rust', 'markdown'],
      });

      expect(isLanguageSupported('python')).toBe(false);
      expect(isLanguageSupported('rust')).toBe(false);
      expect(isLanguageSupported('markdown')).toBe(false);
    });

    it('returns true for languages not in the excludelist', () => {
      _setMockConfig('classLens', {
        excludedLanguages: ['python', 'rust'],
      });

      expect(isLanguageSupported('typescriptreact')).toBe(true);
      expect(isLanguageSupported('html')).toBe(true);
      expect(isLanguageSupported('astro')).toBe(true);
    });

    it('returns true for empty string languageId (not excluded)', () => {
      expect(isLanguageSupported('')).toBe(true);
    });
  });

  describe('transformPatterns', () => {
    it('returns transformPatterns from config', () => {
      _setMockConfig('classLens', {
        transformPatterns: [
          { pattern: 'styles\\.', replacement: '', flags: 'g' },
        ],
      });
      const config = getConfig();
      expect(config.transformPatterns).toEqual([
        { pattern: 'styles\\.', replacement: '', flags: 'g' },
      ]);
    });

    it('normalizes missing replacement to empty string', () => {
      _setMockConfig('classLens', {
        transformPatterns: [{ pattern: 'foo' }],
      });
      const config = getConfig();
      expect(config.transformPatterns[0].replacement).toBe('');
      expect(config.transformPatterns[0].flags).toBe('g');
    });

    it('normalizes missing flags to "g"', () => {
      _setMockConfig('classLens', {
        transformPatterns: [{ pattern: 'foo', replacement: 'bar' }],
      });
      const config = getConfig();
      expect(config.transformPatterns[0].flags).toBe('g');
    });

    it('preserves explicitly set flags', () => {
      _setMockConfig('classLens', {
        transformPatterns: [
          { pattern: 'foo', replacement: 'bar', flags: 'si' },
        ],
      });
      const config = getConfig();
      expect(config.transformPatterns[0].flags).toBe('si');
    });

    it('returns default patterns when not configured', () => {
      const config = getConfig();
      expect(config.transformPatterns).toHaveLength(7);
    });
  });
});
