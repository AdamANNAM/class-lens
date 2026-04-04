import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['src/test/unit/**/*.test.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      vscode: path.resolve(__dirname, 'src/test/unit/__mocks__/vscode.ts'),
    },
  },
});
