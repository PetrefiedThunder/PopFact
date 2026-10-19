const assert = require('node:assert/strict');
const { readFileSync, statSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(readFileSync(path.join(root, 'manifest.json'), 'utf8'));

function pngSize(filePath) {
  const header = readFileSync(filePath).subarray(0, 24);
  assert.equal(header.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${filePath} must be a PNG`);
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}

function referencedIcons(section) {
  if (!section || typeof section === 'string') return [];
  return Object.entries(section);
}

test('every manifest icon path exists at the declared pixel size', () => {
  const entries = [
    ...referencedIcons(manifest.icons),
    ...referencedIcons(manifest.action && manifest.action.default_icon)
  ];
  assert.ok(entries.length > 0, 'manifest must declare icons');
  for (const [size, relativePath] of entries) {
    const filePath = path.join(root, relativePath);
    assert.ok(statSync(filePath).size > 100, `${relativePath} is missing or empty`);
    const { width, height } = pngSize(filePath);
    assert.equal(width, Number(size), relativePath);
    assert.equal(height, Number(size), relativePath);
  }
});
