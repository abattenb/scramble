import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

// Plugin to generate version.js for service worker from src/version.ts
function generateVersionPlugin() {
  return {
    name: 'generate-version',
    buildStart() {
      // Read version from TypeScript file
      const versionTsPath = resolve(__dirname, 'src/version.ts');
      const versionTsContent = readFileSync(versionTsPath, 'utf-8');
      const versionMatch = versionTsContent.match(/VERSION\s*=\s*['"](.+?)['"]/);

      if (versionMatch) {
        const version = versionMatch[1];
        // Generate JavaScript version for service worker
        const versionJsContent = `// Auto-generated from src/version.ts - DO NOT EDIT MANUALLY
// Application version
const VERSION = '${version}';
`;
        const versionJsPath = resolve(__dirname, 'public/version.js');
        writeFileSync(versionJsPath, versionJsContent);
        console.log(`Generated public/version.js with version ${version}`);
      }
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), generateVersionPlugin()],
  base: '/scramble/',
})
