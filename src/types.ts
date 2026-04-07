export interface Position {
  line: number;
  character: number;
}

export interface HintData {
  /** The class/className value to display */
  value: string;
  /** Position of the closing tag's '>' character */
  closingTagEnd: Position;
  /** The tag name (e.g. 'div', 'MyComponent') */
  tagName: string;
}

export interface OpeningTagInfo {
  /** The tag name */
  tagName: string;
  /** The raw className/class attribute value */
  classValue: string;
  /** Byte offset of the opening '<' in the source */
  offset: number;
  /** Whether this is a self-closing tag */
  selfClosing: boolean;
}

export interface TransformPattern {
  pattern: string;
  replacement: string;
  flags: string;
}

export interface ClassNamePreviewConfig {
  enabled: boolean;
  renderMode: 'decoration' | 'inlayHint';
  maxLength: number;
  truncateType: 'character' | 'word';
  truncatePosition: 'end' | 'start';
  fontStyle: 'italic' | 'normal';
  opacity: string;
  prefix: string;
  excludedLanguages: string[];
  transformPatterns: TransformPattern[];
}
