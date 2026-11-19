/**
 * يحزم كل الـ JS والـ CSS في ملف index.html واحد
 * حتى يعمل التطبيق الأصلي بالكامل من داخل القشرة المحلية بدون شبكة.
 */
export function viteSingleFile() {
  return {
    name: 'plus-vite-single-file',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const htmlKey = Object.keys(bundle).find((f) => f.endsWith('.html'));
      if (!htmlKey) return;
      const htmlAsset = bundle[htmlKey];
      let html = String(htmlAsset.source);

      for (const [key, chunk] of Object.entries(bundle)) {
        if (key === htmlKey) continue;
        if (chunk.type === 'chunk' && key.endsWith('.js')) {
          const code = chunk.code.replace(/<\/script/gi, '<\\/script');
          const pattern = new RegExp(
            `<script[^>]*src="[^"]*${escapeRe(baseName(key))}"[^>]*></script>`
          );
          html = html.replace(pattern, `<script type="module">\n${code}\n</script>`);
          delete bundle[key];
        }
        if (chunk.type === 'asset' && key.endsWith('.css')) {
          const css = String(chunk.source);
          const pattern = new RegExp(
            `<link[^>]*href="[^"]*${escapeRe(baseName(key))}"[^>]*>`
          );
          html = html.replace(pattern, `<style>\n${css}\n</style>`);
          delete bundle[key];
        }
      }

      htmlAsset.source = html;
    },
  };
}

function baseName(p) {
  return p.split('/').pop();
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
