import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const app = fileURLToPath(new URL('../../src/app/', import.meta.url));
const read = (path) => readFileSync(join(app, path), 'utf8');
const mountsShell = /<StorefrontShell(?:[>\s])|export default StorefrontShell;/;

test('the root retains the cart provider and delegates storefront UI to public entries', () => {
  const root = read('layout.tsx');
  assert.match(root, /<CartProvider>\{children\}<\/CartProvider>/);
  assert.doesNotMatch(root, /StorefrontShell|TopAnnouncementBar|DrawerCart|FloatingWhatsAppButton|<Header|<Footer/);
});

test('each public page mounts the storefront shell exactly once', () => {
  const pages = readdirSync(app, { recursive: true })
    .filter((path) => path.split(/[\\/]/).at(-1) === 'page.tsx')
    .filter((path) => !/^operaciones[\\/]/.test(path));

  for (const page of pages) {
    let mounts = Number(mountsShell.test(read(page)));
    for (let folder = dirname(page); normalize(folder) !== '.'; folder = dirname(folder)) {
      const layout = join(folder, 'layout.tsx');
      if (existsSync(join(app, layout))) mounts += Number(mountsShell.test(read(layout)));
    }
    assert.equal(mounts, 1, page);
  }
});

test('public and operational not-found boundaries use their own compositions', () => {
  assert.match(read('not-found.tsx'), mountsShell);
  assert.doesNotMatch(read('operaciones/not-found.tsx'), mountsShell);
  assert.doesNotMatch(read('operaciones/layout.tsx'), mountsShell);
});
