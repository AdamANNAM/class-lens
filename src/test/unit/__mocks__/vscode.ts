import { vi } from 'vitest';

// --- Position & Range ---

export class Position {
  constructor(
    public readonly line: number,
    public readonly character: number
  ) {}
}

export class Range {
  public readonly start: Position;
  public readonly end: Position;

  constructor(startOrStartLine: Position | number, endOrStartChar: Position | number, endLine?: number, endChar?: number) {
    if (startOrStartLine instanceof Position && endOrStartChar instanceof Position) {
      this.start = startOrStartLine;
      this.end = endOrStartChar;
    } else {
      this.start = new Position(startOrStartLine as number, endOrStartChar as number);
      this.end = new Position(endLine ?? 0, endChar ?? 0);
    }
  }
}

// --- InlayHint ---

export enum InlayHintKind {
  Type = 1,
  Parameter = 2,
}

export class InlayHint {
  paddingLeft?: boolean;
  paddingRight?: boolean;

  constructor(
    public position: Position,
    public label: string,
    public kind?: InlayHintKind
  ) {}
}

// --- ThemeColor ---

export class ThemeColor {
  constructor(public readonly id: string) {}
}

// --- DecorationRangeBehavior ---

export enum DecorationRangeBehavior {
  OpenOpen = 0,
  ClosedClosed = 1,
  OpenClosed = 2,
  ClosedOpen = 3,
}

// --- EventEmitter ---

export class EventEmitter<T> {
  private listeners: ((e: T) => void)[] = [];

  event = (listener: (e: T) => void) => {
    this.listeners.push(listener);
    return { dispose: () => { this.listeners = this.listeners.filter((l) => l !== listener); } };
  };

  fire(data: T): void {
    this.listeners.forEach((l) => l(data));
  }

  dispose(): void {
    this.listeners = [];
  }
}

// --- ConfigurationTarget ---

export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3,
}

// --- workspace.getConfiguration mock ---

const configStore: Record<string, Record<string, unknown>> = {};

export function _setMockConfig(section: string, values: Record<string, unknown>): void {
  configStore[section] = { ...values };
}

export function _clearMockConfig(): void {
  for (const key of Object.keys(configStore)) {
    delete configStore[key];
  }
}

export const workspace = {
  getConfiguration: vi.fn((section: string) => {
    const store = configStore[section] ?? {};
    return {
      get: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key in store) {
          return store[key] as T;
        }
        return defaultValue;
      }),
      update: vi.fn(),
    };
  }),
};

// --- window mock ---

const mockDecorationType = {
  dispose: vi.fn(),
  key: 'mock-decoration-type',
};

export const window = {
  createTextEditorDecorationType: vi.fn(() => mockDecorationType),
  activeTextEditor: undefined as unknown,
};

// --- languages mock ---

export const languages = {
  registerInlayHintsProvider: vi.fn(() => ({ dispose: vi.fn() })),
};
