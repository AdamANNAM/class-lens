import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

const fixturesPath = path.resolve(__dirname, '../../../test-fixtures');
const EXT_ID = 'Homuzu.class-lens';

suite('Class Lens Extension', () => {
  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension(EXT_ID);
    if (ext && !ext.isActive) {
      await ext.activate();
    }
  });

  test('Extension should be present', () => {
    const ext = vscode.extensions.getExtension(EXT_ID);
    assert.ok(ext, 'Extension should be installed');
  });

  test('Extension should activate on TSX file', async () => {
    const uri = vscode.Uri.file(path.join(fixturesPath, 'simple.tsx'));
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);

    const ext = vscode.extensions.getExtension(EXT_ID);
    assert.ok(ext, 'Extension should be installed');

    await new Promise((resolve) => setTimeout(resolve, 500));
    assert.ok(ext.isActive, 'Extension should be active');
  });

  test('Extension should activate on HTML file', async () => {
    const uri = vscode.Uri.file(path.join(fixturesPath, 'html-class.html'));
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);

    const ext = vscode.extensions.getExtension(EXT_ID);
    assert.ok(ext);

    await new Promise((resolve) => setTimeout(resolve, 500));
    assert.ok(ext.isActive, 'Extension should be active');
  });

  test('Inlay hints should be provided for TSX file', async () => {
    await vscode.workspace
      .getConfiguration('classnamePreview')
      .update('renderMode', 'inlayHint', vscode.ConfigurationTarget.Global);

    const uri = vscode.Uri.file(path.join(fixturesPath, 'simple.tsx'));
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const range = new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(document.lineCount - 1, 0)
    );

    const hints = await vscode.commands.executeCommand<vscode.InlayHint[]>(
      'vscode.executeInlayHintProvider',
      uri,
      range
    );

    assert.ok(hints, 'Should return inlay hints');
    assert.ok(hints.length > 0, `Should have at least one hint, got ${hints.length}`);

    await vscode.workspace
      .getConfiguration('classnamePreview')
      .update('renderMode', undefined, vscode.ConfigurationTarget.Global);
  });

  test('Inlay hints should contain full long Tailwind class strings', async () => {
    await vscode.workspace
      .getConfiguration('classnamePreview')
      .update('renderMode', 'inlayHint', vscode.ConfigurationTarget.Global);
    await vscode.workspace
      .getConfiguration('classnamePreview')
      .update('maxLength', 0, vscode.ConfigurationTarget.Global);

    const uri = vscode.Uri.file(path.join(fixturesPath, 'tailwind.tsx'));
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const range = new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(document.lineCount - 1, 0)
    );

    const hints = await vscode.commands.executeCommand<vscode.InlayHint[]>(
      'vscode.executeInlayHintProvider',
      uri,
      range
    );

    assert.ok(hints, 'Should return inlay hints');
    // tailwind.tsx has 6 elements with className, 1 is self-closing (button is not self-closing)
    assert.strictEqual(hints.length, 6, `Expected 6 hints for tailwind.tsx, got ${hints.length}`);

    // Extract just the label text from each hint
    const labels = hints.map((h) => {
      const label = typeof h.label === 'string' ? h.label : h.label.map((p) => p.value).join('');
      // Strip the prefix
      return label.replace(/^\/\/ /, '');
    });

    // The innermost closing tag (h1) should have the full untruncated value
    assert.ok(
      labels.some((l) => l === 'text-xl font-bold tracking-tight text-slate-900 dark:text-white'),
      'Should contain the full h1 Tailwind class string'
    );

    // The button's long class string should be fully present
    assert.ok(
      labels.some((l) =>
        l.includes('inline-flex items-center') && l.includes('focus-visible:outline-blue-600')
      ),
      'Should contain the full button Tailwind class string'
    );

    // The outermost div should have the gradient classes
    assert.ok(
      labels.some((l) => l.includes('min-h-screen bg-gradient-to-br')),
      'Should contain the outermost div gradient classes'
    );

    await vscode.workspace
      .getConfiguration('classnamePreview')
      .update('renderMode', undefined, vscode.ConfigurationTarget.Global);
    await vscode.workspace
      .getConfiguration('classnamePreview')
      .update('maxLength', undefined, vscode.ConfigurationTarget.Global);
  });

  test('Inlay hints should respect maxLength truncation on long Tailwind classes', async () => {
    await vscode.workspace
      .getConfiguration('classnamePreview')
      .update('renderMode', 'inlayHint', vscode.ConfigurationTarget.Global);
    await vscode.workspace
      .getConfiguration('classnamePreview')
      .update('maxLength', 20, vscode.ConfigurationTarget.Global);

    const uri = vscode.Uri.file(path.join(fixturesPath, 'tailwind.tsx'));
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const range = new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(document.lineCount - 1, 0)
    );

    const hints = await vscode.commands.executeCommand<vscode.InlayHint[]>(
      'vscode.executeInlayHintProvider',
      uri,
      range
    );

    assert.ok(hints, 'Should return inlay hints');

    // Every hint label (after prefix) should be at most 20 + 3 chars (truncated + '...')
    for (const hint of hints) {
      const label = typeof hint.label === 'string' ? hint.label : hint.label.map((p) => p.value).join('');
      const value = label.replace(/^\/\/ /, '');
      assert.ok(
        value.length <= 23,
        `Hint "${value}" should be truncated to at most 23 chars (20 + "..."), got ${value.length}`
      );
    }

    // Clean up
    await vscode.workspace
      .getConfiguration('classnamePreview')
      .update('renderMode', undefined, vscode.ConfigurationTarget.Global);
    await vscode.workspace
      .getConfiguration('classnamePreview')
      .update('maxLength', undefined, vscode.ConfigurationTarget.Global);
  });
});
