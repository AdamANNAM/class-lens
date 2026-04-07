import * as vscode from 'vscode';
import { extractHints } from './parser.js';
import { getConfig, isLanguageSupported } from './configuration.js';
import {
  createDecorationType,
  applyDecorations,
  clearDecorations,
  disposeDecorationType,
} from './decorationProvider.js';
import { ClassNameInlayHintsProvider } from './inlayHintProvider.js';

let decorationType: vscode.TextEditorDecorationType | undefined;
let inlayHintsProvider: ClassNameInlayHintsProvider | undefined;
let inlayHintsDisposable: vscode.Disposable | undefined;
let debounceTimer: ReturnType<typeof globalThis.setTimeout> | undefined;

const setupProviders = (
  renderMode: 'decoration' | 'inlayHint',
  context: vscode.ExtensionContext
) => {
  if (decorationType) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      clearDecorations(editor, decorationType);
    }
    disposeDecorationType();
    decorationType = undefined;
  }

  if (inlayHintsDisposable) {
    inlayHintsDisposable.dispose();
    inlayHintsDisposable = undefined;
  }

  if (inlayHintsProvider) {
    inlayHintsProvider.dispose();
    inlayHintsProvider = undefined;
  }

  const config = getConfig();

  if (renderMode === 'decoration') {
    decorationType = createDecorationType(config);
  } else {
    inlayHintsProvider = new ClassNameInlayHintsProvider();
    inlayHintsDisposable = vscode.languages.registerInlayHintsProvider(
      { scheme: 'file' },
      inlayHintsProvider
    );
    context.subscriptions.push(inlayHintsDisposable);
  }
};

const triggerUpdateForActiveEditor = () => {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const config = getConfig();

  if (!config.enabled || !isLanguageSupported(editor.document.languageId)) {
    if (decorationType) {
      clearDecorations(editor, decorationType);
    }
    return;
  }

  if (config.renderMode === 'decoration' && decorationType) {
    const text = editor.document.getText();
    const hints = extractHints(text, config.maxLength, config.truncateType, config.truncatePosition, config.transformPatterns);
    applyDecorations(editor, hints, config, decorationType);
  }

  if (config.renderMode === 'inlayHint' && inlayHintsProvider) {
    inlayHintsProvider.refresh();
  }
};

const debounceUpdate = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    triggerUpdateForActiveEditor();
  }, 200);
};

export const activate = (context: vscode.ExtensionContext) => {
  const config = getConfig();

  setupProviders(config.renderMode, context);
  triggerUpdateForActiveEditor();

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      triggerUpdateForActiveEditor();
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      const editor = vscode.window.activeTextEditor;
      if (editor && event.document === editor.document) {
        debounceUpdate();
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('classnamePreview')) {
        const newConfig = getConfig();
        setupProviders(newConfig.renderMode, context);
        triggerUpdateForActiveEditor();
      }
    })
  );
};

export const deactivate = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  disposeDecorationType();
  if (inlayHintsProvider) {
    inlayHintsProvider.dispose();
  }
};
