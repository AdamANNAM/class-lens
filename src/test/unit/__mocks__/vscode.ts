import { vi } from 'vitest';

// --- Position & Range ---

export class Position {
  constructor(
    public readonly line: number,
    public readonly character: number,
  ) {}
}

export class Range {
  constructor(
    public readonly start: Position,
    public readonly end: Position,
  ) {}
}

// --- InlayHint ---

export class InlayHint {
  paddingLeft?: boolean;

  constructor(
    public position: Position,
    public label: string,
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
    return {
      dispose: () => {
        this.listeners = this.listeners.filter((l) => l !== listener);
      },
    };
  };

  fire(data: T) {
    this.listeners.forEach((l) => l(data));
  }

  dispose() {
    this.listeners = [];
  }
}

// --- workspace.getConfiguration mock ---

const configStore: Record<string, Record<string, unknown>> = {};

export function _setMockConfig(
  section: string,
  values: Record<string, unknown>,
) {
  configStore[section] = { ...(configStore[section] ?? {}), ...values };
}

export function _clearMockConfig() {
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
    };
  }),
};

// --- window mock ---

const mockDecorationType = {
  dispose: vi.fn(),
};

export const window = {
  createTextEditorDecorationType: vi.fn(() => mockDecorationType),
};

// --- languages mock ---

export const languages = {
  registerInlayHintsProvider: vi.fn(() => ({ dispose: vi.fn() })),
};
