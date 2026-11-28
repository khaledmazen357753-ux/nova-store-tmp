/**
 * فحص سلامة قواعد الـHooks في مكوّنات الواجهة
 * ═══════════════════════════════════════════════════════════════════
 *
 * العطل الذي منع هذا الملف من الوجود:
 *
 *   const [flash, setFlash] = useState(null);   // ← سطر 247
 *   ...
 *   if (!open) return null;                     // ← سطر 190
 *
 * الـHook كان **بعد** الخروج المبكر. React يشترط أن تُنادى نفس الـHooks
 * بنفس الترتيب في كل تصيير. فعند فتح الشاشة يتغيّر عدد الـHooks من N إلى
 * N+1، ويرمي React:
 *
 *   Rendered more hooks than during the previous render.
 *
 * وبلا Error Boundary، الانهيار يمحو شجرة React كلها → **شاشة سوداء**.
 * من الخارج يبدو كأن التطبيق تعطّل بالكامل، لا كمكوّن واحد به خطأ.
 *
 * ─ لماذا فحص نصي وليس تشغيلاً فعلياً؟ ────────────────────────────────
 * تشغيل كل مكوّن في DOM حقيقي يتطلب تركيب التطبيق كاملاً — بطيء وهشّ.
 * القاعدة نفسها بسيطة وميكانيكية: لا hook بعد خروج مبكر. والفحص النصي
 * يكتشفها في كل الملفات، بما فيها ملفات لم تُكتب بعد.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');

let pass = 0;
let fail = 0;
const check = (name, ok, extra = '') => {
  console.log(`  ${ok ? '✅' : '❌'} ${name}${extra ? ` — ${extra}` : ''}`);
  ok ? pass++ : fail++;
};

/** يجمع كل ملفات .tsx/.ts تحت مجلد */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (/\.(tsx|ts)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * يفحص ملفاً واحداً: هل هناك hook بعد أول `return` داخل جسم المكوّن؟
 *
 * ─ كيف نحدّد "داخل جسم المكوّن" بلا AST؟ ──────────────────────────
 * نبحث عن أسطر `return null;` / `return <` التي تظهر بمستوى إزاحة سطر
 * واحد (سطرين مسافات) — وهو مستوى جسم المكوّن في كل ملفات هذا المشروع.
 * أي hook بعده بنفس المستوى أو أعمق يُعدّ مشكلة.
 *
 * هذا تقريب واعٍ: قد يُنتج إيجابية كاذبة لو كان هناك دالة مساعدة داخلية
 * تستخدم hooks. حينها الحل هو إعادة التسمية، لا تعطيل الفحص — والفحص
 * سيقول لنا بالضبط أين.
 */
function findHooksAfterEarlyReturn(source) {
  const lines = source.split('\n');
  const problems = [];

  // موضع أول خروج مبكر على مستوى جسم المكوّن
  let firstEarlyReturn = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    // مستوى إزاحة سطرين تماماً + return null أو return (...)
    if (/^ {2}if \(.*\) return null;?\s*$/.test(line)) {
      firstEarlyReturn = i;
      break;
    }
  }
  if (firstEarlyReturn === -1) return [];

  for (let i = firstEarlyReturn + 1; i < lines.length; i += 1) {
    const line = lines[i];
    // hook على مستوى جسم المكوّن (سطران) أو أعمق
    if (/^ {2,}\s*(const\s*\[[^\]]*\]\s*=\s*)?(useState|useEffect|useCallback|useMemo|useRef|useReducer|useLayoutEffect|useContext)\s*[(<]/.test(line)) {
      problems.push({ line: i + 1, text: line.trim().slice(0, 70) });
    }
  }
  return problems;
}

console.log('فحص قواعد الـHooks في المكوّنات\n');

const files = [
  ...walk(path.join(ROOT, 'src', 'components')),
  ...walk(path.join(ROOT, 'src', 'modules')),
  path.join(ROOT, 'src', 'App.tsx'),
];

let checked = 0;
let problemsTotal = 0;

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  if (!/React\.FC|: React\.FC|export const \w+.*=.*\(/.test(source)) continue;
  checked += 1;

  const name = path.relative(ROOT, file);
  const problems = findHooksAfterEarlyReturn(source);

  if (problems.length === 0) continue;

  problemsTotal += problems.length;
  check(
    `${name} — لا hooks بعد الخروج المبكر`,
    false,
    problems.map((p) => `سطر ${p.line}: ${p.text}`).join(' | ')
  );
}

check(
  'كل المكوّنات تحترم ترتيب الـHooks',
  problemsTotal === 0,
  problemsTotal === 0 ? `${checked} ملفاً` : `${problemsTotal} مخالفة في ${checked} ملفاً`
);

// فحص تكميلي: هل يوجد Error Boundary أصلاً؟
// بدونه، أي خطأ في أي مكوّن = شاشة سوداء بلا معلومات. حتى لو أصلحنا هذا
// العطل بعينه، العطل القادم سيتكرر بنفس المظهر الصامت.
const hasBoundary = files.some((f) => {
  const src = readFileSync(f, 'utf8');
  return /componentDidCatch|getDerivedStateFromError|ErrorBoundary/.test(src);
});
check(
  'يوجد Error Boundary يحوّل أي انهيار إلى رسالة بدل شاشة سوداء',
  hasBoundary,
  hasBoundary ? '' : 'لا يوجد — أي خطأ في أي مكوّن يمحو الشاشة كلها'
);

console.log(`\nالنتيجة: ${pass} نجح | ${fail} فشل`);
process.exit(fail ? 1 : 0);
