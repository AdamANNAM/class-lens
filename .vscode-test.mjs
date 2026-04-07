import { defineConfig } from '@vscode/test-cli';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  files: 'dist/test/integration/**/*.test.js',
  extensionDevelopmentPath: __dirname,
  mocha: {
    timeout: 20000,
  },
});
