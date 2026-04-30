import { ok, strictEqual } from 'assert';
import { join, resolve } from 'path';
import {
  ConfigurationTarget,
  InlayHint,
  Position,
  Range,
  Uri,
  commands,
  extensions,
  window,
  workspace,
} from 'vscode';

const fixturesPath = resolve(__dirname, '../../../test-fixtures');
const EXT_ID = 'Homuzu.class-lens';

suite('Class Lens Extension', () => {
  suiteSetup(async () => {
    const ext = extensions.getExtension(EXT_ID);
    if (ext && !ext.isActive) {
      await ext.activate();
    }
  });

  test('Extension should be present', () => {
    const ext = extensions.getExtension(EXT_ID);
    ok(ext, 'Extension should be installed');
  });

  test('Extension should activate on TSX file', async () => {
    const uri = Uri.file(join(fixturesPath, 'simple.tsx'));
    const document = await workspace.openTextDocument(uri);
    await window.showTextDocument(document);

    const ext = extensions.getExtension(EXT_ID);
    ok(ext, 'Extension should be installed');

    await new Promise((resolve) => setTimeout(resolve, 500));
    ok(ext.isActive, 'Extension should be active');
  });

  test('Extension should activate on HTML file', async () => {
    const uri = Uri.file(join(fixturesPath, 'html-class.html'));
    const document = await workspace.openTextDocument(uri);
    await window.showTextDocument(document);

    const ext = extensions.getExtension(EXT_ID);
    ok(ext);

    await new Promise((resolve) => setTimeout(resolve, 500));
    ok(ext.isActive, 'Extension should be active');
  });

  test('Inlay hints should be provided for TSX file', async () => {
    await workspace
      .getConfiguration('classLens')
      .update('renderMode', 'inlayHint', ConfigurationTarget.Global);

    const uri = Uri.file(join(fixturesPath, 'simple.tsx'));
    const document = await workspace.openTextDocument(uri);
    await window.showTextDocument(document);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const range = new Range(
      new Position(0, 0),
      new Position(document.lineCount - 1, 0),
    );

    const hints = await commands.executeCommand<InlayHint[]>(
      'vscode.executeInlayHintProvider',
      uri,
      range,
    );

    ok(hints, 'Should return inlay hints');
    ok(hints.length > 0, `Should have at least one hint, got ${hints.length}`);

    await workspace
      .getConfiguration('classLens')
      .update('renderMode', undefined, ConfigurationTarget.Global);
  });

  test('Inlay hints should contain full long Tailwind class strings', async () => {
    await workspace
      .getConfiguration('classLens')
      .update('renderMode', 'inlayHint', ConfigurationTarget.Global);
    await workspace
      .getConfiguration('classLens')
      .update('maxLength', 0, ConfigurationTarget.Global);
    await workspace
      .getConfiguration('classLens')
      .update('showSameLine', true, ConfigurationTarget.Global);

    const uri = Uri.file(join(fixturesPath, 'tailwind.tsx'));
    const document = await workspace.openTextDocument(uri);
    await window.showTextDocument(document);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const range = new Range(
      new Position(0, 0),
      new Position(document.lineCount - 1, 0),
    );

    const hints = await commands.executeCommand<InlayHint[]>(
      'vscode.executeInlayHintProvider',
      uri,
      range,
    );

    ok(hints, 'Should return inlay hints');
    // tailwind.tsx has 6 elements with className, 1 is self-closing (button is not self-closing)
    strictEqual(
      hints.length,
      6,
      `Expected 6 hints for tailwind.tsx, got ${hints.length}`,
    );

    // Extract just the label text from each hint
    const labels = hints.map((h) => {
      const label =
        typeof h.label === 'string'
          ? h.label
          : h.label.map((p) => p.value).join('');
      // Strip the prefix and suffix (default: '/* ' ... ' */')
      return label.replace(/^\/\* | \*\/$/g, '');
    });

    // The innermost closing tag (h1) should have the full untruncated value
    ok(
      labels.some(
        (l) =>
          l ===
          'text-xl font-bold tracking-tight text-slate-900 dark:text-white',
      ),
      'Should contain the full h1 Tailwind class string',
    );

    // The button's long class string should be fully present
    ok(
      labels.some(
        (l) =>
          l.includes('inline-flex items-center') &&
          l.includes('focus-visible:outline-blue-600'),
      ),
      'Should contain the full button Tailwind class string',
    );

    // The outermost div should have the gradient classes
    ok(
      labels.some((l) => l.includes('min-h-screen bg-gradient-to-br')),
      'Should contain the outermost div gradient classes',
    );

    await workspace
      .getConfiguration('classLens')
      .update('renderMode', undefined, ConfigurationTarget.Global);
    await workspace
      .getConfiguration('classLens')
      .update('maxLength', undefined, ConfigurationTarget.Global);
    await workspace
      .getConfiguration('classLens')
      .update('showSameLine', undefined, ConfigurationTarget.Global);
  });

  test('Inlay hints should respect maxLength truncation on long Tailwind classes', async () => {
    await workspace
      .getConfiguration('classLens')
      .update('renderMode', 'inlayHint', ConfigurationTarget.Global);
    await workspace
      .getConfiguration('classLens')
      .update('maxLength', 20, ConfigurationTarget.Global);

    const uri = Uri.file(join(fixturesPath, 'tailwind.tsx'));
    const document = await workspace.openTextDocument(uri);
    await window.showTextDocument(document);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const range = new Range(
      new Position(0, 0),
      new Position(document.lineCount - 1, 0),
    );

    const hints = await commands.executeCommand<InlayHint[]>(
      'vscode.executeInlayHintProvider',
      uri,
      range,
    );

    ok(hints, 'Should return inlay hints');

    // Every hint label (after prefix) should be at most 20 + 3 chars (truncated + '...')
    for (const hint of hints) {
      const label =
        typeof hint.label === 'string'
          ? hint.label
          : hint.label.map((p) => p.value).join('');
      const value = label.replace(/^\/\* | \*\/$/g, '');
      ok(
        value.length <= 23,
        `Hint "${value}" should be truncated to at most 23 chars (20 + "..."), got ${value.length}`,
      );
    }

    // Clean up
    await workspace
      .getConfiguration('classLens')
      .update('renderMode', undefined, ConfigurationTarget.Global);
    await workspace
      .getConfiguration('classLens')
      .update('maxLength', undefined, ConfigurationTarget.Global);
  });
});
