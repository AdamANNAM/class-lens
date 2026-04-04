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
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const config = getConfig();

  setupProviders(config.renderMode, context);
  triggerUpdateForActiveEditor();

  // Update on active editor change
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      triggerUpdateForActiveEditor();
    })
  );

  // Update on document change with debounce
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      const editor = vscode.window.activeTextEditor;
      if (editor && event.document === editor.document) {
        debounceUpdate();
      }
    })
  );

  // Re-setup on configuration change
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('classnamePreview')) {
        const newConfig = getConfig();
        setupProviders(newConfig.renderMode, context);
        triggerUpdateForActiveEditor();
      }
    })
  );
}

function setupProviders(
  renderMode: 'decoration' | 'inlayHint',
  context: vscode.ExtensionContext
): void {
  // Clean up existing providers
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
}

function triggerUpdateForActiveEditor(): void {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const config = getConfig();

  if (!config.enabled || !isLanguageSupported(editor.document.languageId)) {
    // Clear decorations if language not supported
    if (decorationType) {
      clearDecorations(editor, decorationType);
    }
    return;
  }

  if (config.renderMode === 'decoration' && decorationType) {
    const text = editor.document.getText();
    const hints = extractHints(text, config.maxLength, config.truncateType, config.truncatePosition);
    applyDecorations(editor, hints, config, decorationType);
  }

  // Inlay hints are handled automatically by the provider
  if (config.renderMode === 'inlayHint' && inlayHintsProvider) {
    inlayHintsProvider.refresh();
  }
}

function debounceUpdate(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    triggerUpdateForActiveEditor();
  }, 200);
}

export function deactivate(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  disposeDecorationType();
  if (inlayHintsProvider) {
    inlayHintsProvider.dispose();
  }
}
