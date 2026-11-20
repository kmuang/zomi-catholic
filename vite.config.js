import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { defineConfig } from 'vite';

const publicAssets = [
  'manifest.webmanifest',
  'labu.svg',
  'labu-180.png',
  'labu-192.png',
  'labu-512.png',
  'stained-glass.jpg',
  'gal-hiam-book.png',
];

export default defineConfig({
  plugins: [{
    name: 'hymnal-offline',
    apply: 'build',
    generateBundle: {
      order: 'post',
      async handler(_options, bundle) {
        const worker = await readFile(new URL('./src/service-worker.js', import.meta.url), 'utf8');
        const release = createHash('sha256').update(worker);
        for (const file of Object.values(bundle)) {
          release.update(file.fileName).update(file.type === 'chunk' ? file.code : file.source);
        }
        for (const file of publicAssets) {
          release.update(file).update(await readFile(new URL(`./public/${file}`, import.meta.url)));
        }
        const files = [...Object.keys(bundle), ...publicAssets];
        const version = release.digest('hex').slice(0, 16);

        this.emitFile({
          type: 'asset',
          fileName: 'sw.js',
          source: `const VERSION = ${JSON.stringify(version)};\nconst FILES = ${JSON.stringify(files)};\n${worker}`,
        });
      },
    },
  }],
});
