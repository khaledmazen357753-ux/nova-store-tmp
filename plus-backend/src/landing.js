/**
 * الصفحة التعريفية لخادم المحاسبي Plus — هوية سوداء وذهبية مطابقة للشعار
 * تُعرض على المسار الجذري / بدلاً من نص JSON الخام.
 */

const EMBLEM = `
<svg viewBox="0 0 200 200" class="emblem" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="gl" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF6C7"/><stop offset="45%" stop-color="#E9C662"/><stop offset="100%" stop-color="#C59B27"/>
    </linearGradient>
    <linearGradient id="gd" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C89E2B"/><stop offset="55%" stop-color="#9A7217"/><stop offset="100%" stop-color="#634609"/>
    </linearGradient>
    <linearGradient id="gm" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FBE59B"/><stop offset="50%" stop-color="#D4AF37"/><stop offset="100%" stop-color="#8C6714"/>
    </linearGradient>
    <radialGradient id="gem" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF"/><stop offset="65%" stop-color="#FDF1C4"/><stop offset="100%" stop-color="#C9A227"/>
    </radialGradient>
  </defs>

  <!-- أوراق الغار الذهبية حول الزائد -->
  <g opacity="0.95">
    ${[0, 90, 180, 270]
      .map(
        (rot) => `
    <g transform="rotate(${rot} 100 100)">
      <g transform="rotate(32 100 100)">
        <path d="M100 84 C93 64, 94 48, 100 36 C100 54, 100 70, 100 84 Z" fill="url(#gl)"/>
        <path d="M100 84 C107 64, 106 48, 100 36 C100 54, 100 70, 100 84 Z" fill="url(#gd)"/>
      </g>
      <g transform="rotate(58 100 100)">
        <path d="M100 84 C93 64, 94 48, 100 36 C100 54, 100 70, 100 84 Z" fill="url(#gl)"/>
        <path d="M100 84 C107 64, 106 48, 100 36 C100 54, 100 70, 100 84 Z" fill="url(#gd)"/>
      </g>
    </g>`
      )
      .join('')}
  </g>

  <!-- الصليب الذهبي ذو الرؤوس الماسية المشطوفة -->
  <g>
    <path d="M100 26 L113 60 L147 73 L113 86 L100 120 L87 86 L53 73 L87 60 Z"
          fill="url(#gm)" stroke="#FCE79C" stroke-width="1.1"/>
    <path d="M100 40 L108 63 L131 73 L108 83 L100 106 L92 83 L69 73 L92 63 Z"
          fill="none" stroke="#7A5B10" stroke-width="1" opacity="0.75"/>
    <path d="M100 26 L100 120" stroke="#FFF3C4" stroke-width="0.9" opacity="0.55"/>
    <path d="M53 73 L147 73" stroke="#FFF3C4" stroke-width="0.9" opacity="0.55"/>
    <circle cx="100" cy="73" r="7.5" fill="url(#gem)" stroke="#B08A1E" stroke-width="0.8"/>
    <circle cx="100" cy="38" r="3.4" fill="url(#gem)"/>
    <circle cx="100" cy="108" r="3.4" fill="url(#gem)"/>
    <circle cx="62" cy="73" r="3.4" fill="url(#gem)"/>
    <circle cx="138" cy="73" r="3.4" fill="url(#gem)"/>
  </g>
</svg>`;

function landingPage({ company, health }) {
  const companyName = (company && company.company_name) || 'المحاسبي Plus';
  const fiscalYear = (company && company.fiscal_year) || '';
  const frontendDomain = (company && company.frontend_domain) || '';
  const adminDomain = (company && company.admin_domain) || '';

  const endpoints = [
    ['/api/health', 'فحص حالة الخدمة'],
    ['/api/auth/demo-accounts', 'الحسابات التجريبية المتاحة'],
    ['/api/auth/login', 'تسجيل الدخول وإصدار التوكن'],
    ['/api/master/*', 'البيانات الأساسية — دليل الحسابات، الأصناف، العملاء، الموردون'],
    ['/api/transactions/*', 'الحركات — اليومية، المبيعات، المشتريات، المخازن، الرواتب'],
    ['/api/reports/*', 'التقارير المالية والتحليلية (21 تقريراً)'],
    ['/api/admin/*', 'بوابة مدير النظام — الصلاحيات والفترات المالية'],
  ];

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>المحاسبي Plus — خادم البيانات المستقل (API)</title>
<meta name="description" content="خادم البيانات المستقل لمنظومة المحاسبي Plus — حالة الخدمة وروابط التطبيق وبوابة مدير النظام." />
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#050507"/><path d="M50 15 L60 40 L85 50 L60 60 L50 85 L40 60 L15 50 L40 40 Z" fill="#D4AF37"/></svg>'
  )}" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    min-height: 100vh; background: #050507; color: #EDE6D6;
    font-family: "Segoe UI", Tahoma, "Noto Naskh Arabic", system-ui, sans-serif;
    display: flex; align-items: center; justify-content: center; padding: 28px 16px;
    background-image:
      radial-gradient(circle at 50% 0%, rgba(212,175,55,0.18), transparent 55%),
      radial-gradient(circle at 85% 90%, rgba(212,175,55,0.08), transparent 45%);
  }
  .wrap { width: 100%; max-width: 880px; position: relative; }
  .watermark {
    position: fixed; inset: 0; display: grid; place-items: center;
    pointer-events: none; opacity: 0.035; z-index: 0;
  }
  .watermark svg { width: min(88vw, 720px); }
  .card {
    position: relative; z-index: 1;
    background: linear-gradient(180deg, #12110E 0%, #09090C 45%, #050507 100%);
    border: 1px solid rgba(212,175,55,0.55);
    border-radius: 20px; padding: 40px 30px;
    box-shadow: 0 0 0 1px rgba(212,175,55,0.14) inset, 0 0 60px rgba(212,175,55,0.12), 0 24px 70px rgba(0,0,0,0.65);
  }
  .card::before, .card::after {
    content: ""; position: absolute; border-radius: 24px; pointer-events: none;
    border: 1px solid rgba(212,175,55,0.22);
  }
  .card::before { inset: 8px; }
  .card::after { inset: 15px; border-color: rgba(212,175,55,0.12); }

  .head { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 14px; }
  .emblem { width: 104px; height: 104px; filter: drop-shadow(0 0 22px rgba(212,175,55,0.45)); }
  .names { display: flex; align-items: baseline; gap: 10px; }
  .names h1 { font-size: 30px; font-weight: 800; color: #FAF6EA; }
  .names .plus {
    font-family: Georgia, "Times New Roman", serif; font-size: 38px; font-weight: 700;
    background: linear-gradient(120deg, #FFF3C4, #D4AF37 45%, #8C6714);
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  .tag { font-size: 13px; color: #B8B09C; letter-spacing: .3px; }
  .company { font-size: 13px; color: #9C9480; margin-top: 2px; }

  .status {
    display: inline-flex; align-items: center; gap: 8px; margin-top: 6px;
    padding: 7px 16px; border-radius: 999px;
    border: 1px solid rgba(64,193,120,0.45); background: rgba(64,193,120,0.10);
    font-size: 13px; color: #7BE3A6;
  }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #40C178; box-shadow: 0 0 10px #40C178; }

  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 30px; }
  @media (max-width: 620px) { .grid { grid-template-columns: 1fr; } }

  a.btn {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 17px 20px; border-radius: 14px; text-decoration: none;
    border: 1px solid rgba(212,175,55,0.45); background: rgba(212,175,55,0.06);
    color: #F3EAD2; transition: .22s ease;
  }
  a.btn:hover { background: rgba(212,175,55,0.15); border-color: #D4AF37; transform: translateY(-2px); }
  a.btn.primary {
    background: linear-gradient(120deg, #E9C662, #D4AF37 55%, #B08A1E);
    color: #17130A; border-color: #F3DD9A; font-weight: 800;
  }
  a.btn.primary:hover { filter: brightness(1.07); }
  .btn .txt { display: flex; flex-direction: column; gap: 3px; }
  .btn .t { font-size: 15px; font-weight: 700; }
  .btn .s { font-size: 11.5px; opacity: .75; direction: ltr; text-align: right; }
  .btn .arrow { font-size: 19px; opacity: .8; }

  .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 26px; }
  @media (max-width: 620px) { .meta { grid-template-columns: 1fr; } }
  .stat {
    border: 1px solid rgba(212,175,55,0.22); border-radius: 12px; padding: 14px 16px;
    background: rgba(255,255,255,0.02);
  }
  .stat .k { font-size: 11px; color: #9C9480; margin-bottom: 5px; }
  .stat .v { font-size: 17px; font-weight: 700; color: #E9C662; }

  h2.sec {
    margin-top: 32px; margin-bottom: 12px; font-size: 13px; font-weight: 700;
    color: #D4AF37; letter-spacing: .4px; display: flex; align-items: center; gap: 10px;
  }
  h2.sec::after { content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, rgba(212,175,55,0.4), transparent); }

  .ep { border: 1px solid rgba(212,175,55,0.16); border-radius: 12px; overflow: hidden; }
  .ep .row {
    display: flex; align-items: center; gap: 14px; padding: 10px 15px; font-size: 12.5px;
    border-bottom: 1px solid rgba(212,175,55,0.10);
  }
  .ep .row:last-child { border-bottom: none; }
  .ep .row:hover { background: rgba(212,175,55,0.05); }
  .ep code {
    direction: ltr; font-family: "Consolas", "Courier New", monospace; font-size: 12px;
    color: #E9C662; min-width: 210px; white-space: nowrap;
  }
  .ep .d { color: #A9A294; }

  .foot { margin-top: 26px; text-align: center; font-size: 11.5px; color: #7E7869; line-height: 1.9; }
  .foot b { color: #B8B09C; font-weight: 600; }
  .ping { font-family: "Consolas", monospace; color: #7BE3A6; }
</style>
</head>
<body>
  <div class="watermark">${EMBLEM}</div>

  <div class="wrap">
    <div class="card">
      <div class="head">
        ${EMBLEM}
        <div class="names">
          <h1>المحاسبي</h1><span class="plus">Plus</span>
        </div>
        <div class="tag">خادم البيانات المستقل — Standalone Backend API v1.0.0</div>
        <div class="company">${companyName}${fiscalYear ? ` — السنة المالية ${fiscalYear}` : ''}</div>
        <div class="status">
          <span class="dot"></span>
          <span>الخدمة تعمل الآن</span>
          <span class="ping" id="ping">—</span>
        </div>
      </div>

      <div class="grid">
        <a class="btn primary" href="https://plus-accounting-erp.vercel.app" target="_blank" rel="noopener">
          <span class="txt">
            <span class="t">تطبيق المحاسبي Plus</span>
            <span class="s">plus-accounting-erp.vercel.app</span>
          </span>
          <span class="arrow">←</span>
        </a>
        <a class="btn" href="https://plus-erp-admin.vercel.app" target="_blank" rel="noopener">
          <span class="txt">
            <span class="t">بوابة مدير النظام</span>
            <span class="s">plus-erp-admin.vercel.app</span>
          </span>
          <span class="arrow">←</span>
        </a>
      </div>

      <div class="meta">
        <div class="stat"><div class="k">حالة الاتصال</div><div class="v">متصل ✔</div></div>
        <div class="stat"><div class="k">وقت الاستجابة</div><div class="v" id="latency">—</div></div>
        <div class="stat"><div class="k">البنية</div><div class="v">SQL · 30 جدول</div></div>
      </div>

      <h2 class="sec">مسارات الخدمة المتاحة</h2>
      <div class="ep">
        ${endpoints
          .map(
            ([path, desc]) => `<div class="row"><code>${path}</code><span class="d">${desc}</span></div>`
          )
          .join('')}
      </div>

      <div class="foot">
        هذا الرابط هو <b>خادم بيانات</b> يغذي الواجهات ولا يعرض صفحات.<br />
        للدخول إلى النظام استخدم <b>تطبيق المحاسبي</b> أو <b>بوابة مدير النظام</b> بالأعلى.<br />
        <span style="opacity:.7">للحصول على بيانات الخدمة بصيغة JSON: <code style="color:#E9C662">/api/info</code></span>
      </div>
    </div>
  </div>

  <script>
    (function () {
      var t0 = performance.now();
      fetch('/api/health?t=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var ms = Math.round(performance.now() - t0);
          document.getElementById('ping').textContent = ms + 'ms';
          document.getElementById('latency').textContent = ms + ' ms';
          if (!d.ok) { throw new Error('bad'); }
        })
        .catch(function () {
          var st = document.querySelector('.status');
          st.style.borderColor = 'rgba(224,80,80,.5)';
          st.style.background = 'rgba(224,80,80,.10)';
          st.style.color = '#F09A9A';
          st.querySelector('span:nth-child(2)').textContent = 'تعذر الاتصال بالخدمة';
        });
    })();
  </script>
</body>
</html>`;
}

module.exports = { landingPage };
