import {
  Disposable,
  ExtensionContext,
  TextEditorDecorationType,
  languages,
  window,
  workspace,
} from 'vscode';
import { getConfig, isLanguageSupported } from './configuration.js';
import {
  applyDecorations,
  clearDecorations,
  createDecorationType,
  disposeDecorationType,
} from './decorationProvider.js';
import { ClassNameInlayHintsProvider } from './inlayHintProvider.js';
import { extractHints } from './parser.js';

const DEBOUNCE_MS = 200;

let decorationType: TextEditorDecorationType | undefined;
let inlayHintsProvider: ClassNameInlayHintsProvider | undefined;
let inlayHintsDisposable: Disposable | undefined;
let debounceTimer: ReturnType<typeof globalThis.setTimeout> | undefined;

const setupProviders = (
  renderMode: 'decoration' | 'inlayHint',
  context: ExtensionContext,
) => {
  if (decorationType) {
    const editor = window.activeTextEditor;
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

  if (renderMode === 'decoration') {
    decorationType = createDecorationType();
  } else {
    inlayHintsProvider = new ClassNameInlayHintsProvider();
    inlayHintsDisposable = languages.registerInlayHintsProvider(
      { scheme: 'file' },
      inlayHintsProvider,
    );
    context.subscriptions.push(inlayHintsDisposable);
  }
};

const triggerUpdateForActiveEditor = () => {
  const editor = window.activeTextEditor;
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
    const hints = extractHints(text, {
      maxLength: config.maxLength,
      truncateType: config.truncateType,
      truncatePosition: config.truncatePosition,
      ellipsis: config.ellipsis,
      transformPatterns: config.transformPatterns,
      showSameLine: config.showSameLine,
      hideSelfClosing: config.hideSelfClosing,
    });
    applyDecorations(editor, hints, config, decorationType);
  }

  if (config.renderMode === 'inlayHint' && inlayHintsProvider) {
    inlayHintsProvider.refresh();
  }
};

const debounceUpdate = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(triggerUpdateForActiveEditor, DEBOUNCE_MS);
};

export const activate = (context: ExtensionContext) => {
  const config = getConfig();

  setupProviders(config.renderMode, context);
  triggerUpdateForActiveEditor();

  context.subscriptions.push(
    window.onDidChangeActiveTextEditor(() => {
      triggerUpdateForActiveEditor();
    }),
  );

  context.subscriptions.push(
    workspace.onDidChangeTextDocument((event) => {
      const editor = window.activeTextEditor;
      if (editor && event.document === editor.document) {
        debounceUpdate();
      }
    }),
  );

  context.subscriptions.push(
    workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('classLens')) {
        const newConfig = getConfig();
        setupProviders(newConfig.renderMode, context);
        triggerUpdateForActiveEditor();
      }
    }),
  );
};

export const deactivate = () => {
  clearTimeout(debounceTimer);
  disposeDecorationType();
  inlayHintsProvider?.dispose();
};
