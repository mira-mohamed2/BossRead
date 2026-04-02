/**
 * Bundle Mozilla Readability.js source into a TypeScript constant
 * for injection into WebView.
 *
 * Run: node scripts/bundle-readability.js
 * (Automatically runs as postinstall)
 */
const fs = require('fs');
const path = require('path');

const readabilityPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@mozilla',
  'readability',
  'Readability.js',
);

const source = fs.readFileSync(readabilityPath, 'utf-8');

// Wrap the CommonJS module so it exposes Readability as a global in the WebView
const wrapped = `
// Auto-generated — do not edit. Run: node scripts/bundle-readability.js
// Source: @mozilla/readability (Apache-2.0)

export const READABILITY_JS = ${JSON.stringify(
  `(function(){var module={exports:{}};var exports=module.exports;${source};window.Readability=module.exports;})();`
)};
`;

const outPath = path.join(__dirname, '..', 'src', 'services', 'parsers', 'readabilityBundle.ts');
fs.writeFileSync(outPath, wrapped.trimStart(), 'utf-8');
console.log('✓ Bundled Readability.js →', outPath);
