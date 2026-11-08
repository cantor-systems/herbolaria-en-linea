import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
// Explicit dependency injection for trusted local source, not OS/network isolation.
// No environment files, provider SDKs or production clients are loaded here.
export function loadSource(relativePath, dependencies = {}, globals = {}) {
  const filename = new URL(`../../${relativePath}`, import.meta.url);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    fileName: filename.pathname,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    module, exports: module.exports, Date, URL, URLSearchParams, Request, Response, Headers,
    process: { env: {} },
    fetch() { throw new Error('Network requests are not permitted in these tests.'); },
    ...globals,
    require(name) {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      if (['react', 'react/jsx-runtime', 'lucide-react', 'clsx', 'tailwind-merge'].includes(name)) return require(name);
      throw new Error(`Unexpected local test dependency: ${name}`);
    },
  }, { filename: filename.pathname });
  return module.exports;
}

export function loadPricing({ products, promotions } = {}) {
  const shippingConfig = loadSource('src/config/shipping.ts');
  const shipping = loadSource('src/lib/shipping.ts', { '@/config/shipping': shippingConfig });
  const catalog = products ? { PRODUCTS: products } : loadSource('src/data/products.ts');
  const promotionConfig = promotions ?? loadSource('src/config/promotions.ts');
  const promotionRules = loadSource('src/lib/promotions.ts', { '@/config/promotions': promotionConfig });
  const wholesale = loadSource('src/lib/wholesale.ts');
  const server = loadSource('src/lib/checkout/serverPricing.ts', {
    'server-only': {}, '@/data/products': catalog, '@/lib/promotions': promotionRules,
    '@/lib/shipping': shipping, '@/lib/wholesale': wholesale,
  });
  return { shippingConfig, shipping, catalog, promotionRules, wholesale, server };
}
