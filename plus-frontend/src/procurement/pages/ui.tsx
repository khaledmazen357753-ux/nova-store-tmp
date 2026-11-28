import React from 'react';

/**
 * مكوّنات الواجهة المشتركة لموقع المشتريات.
 *
 * قرار تصميمي: كل ما هو «شكل» يعيش هنا، وكل ما هو «بيانات» يعيش في
 * الصفحات. السبب أن الصفحات الثماني تمرّ على نفس النمط (جدول + نموذج +
 * ملخص)، فتعدد الأنماط كان سيجعل تعديل لون أو مسافة عملية في ثمانية
 * ملفات، ويُنتج واجهة تبدو مجموع أجزاء لا نظاماً واحداً.
 */

export const Card: React.FC<{
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, actions, className = '', children }) => (
  <section className={`royal-card rounded-2xl p-5 ${className}`}>
    {(title || actions) && (
      <header className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          {title && <h2 className="text-sm font-bold text-[#FAF5E8]">{title}</h2>}
          {subtitle && <p className="text-[11px] text-[#8C8474] mt-1 leading-relaxed">{subtitle}</p>}
        </div>
        {actions}
      </header>
    )}
    {children}
  </section>
);

export const KPI: React.FC<{
  label: string;
  value: string;
  hint?: string;
  tone?: 'gold' | 'green' | 'red' | 'neutral';
}> = ({ label, value, hint, tone = 'neutral' }) => {
  const colors: Record<string, string> = {
    gold: 'text-[#E5C158]',
    green: 'text-emerald-300',
    red: 'text-red-300',
    neutral: 'text-[#F7F3E8]',
  };
  return (
    <div className="royal-card rounded-2xl p-4">
      <div className="text-[11px] text-[#9A9282]">{label}</div>
      <div className={`text-lg font-extrabold tabular-nums mt-1.5 ${colors[tone]}`}>{value}</div>
      {hint && <div className="text-[10px] text-[#6F6A5D] mt-1">{hint}</div>}
    </div>
  );
};

export const Money: React.FC<{ value: unknown; currency?: string; tone?: boolean }> = ({
  value,
  currency = 'ج.م',
  tone = false,
}) => {
  const n = Number(value || 0);
  const cls = tone ? (n < 0 ? 'text-red-300' : n > 0 ? 'text-emerald-300' : 'text-[#9A9282]') : '';
  return (
    <span className={`tabular-nums ${cls}`} dir="ltr">
      {n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
      <span className="text-[10px] text-[#8C8474]">{currency}</span>
    </span>
  );
};

export const Num: React.FC<{ value: unknown }> = ({ value }) => (
  <span className="tabular-nums" dir="ltr">
    {Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
  </span>
);

export const Badge: React.FC<{ children: React.ReactNode; tone?: 'gold' | 'green' | 'red' | 'gray' }> = ({
  children,
  tone = 'gray',
}) => {
  const map = {
    gold: 'bg-[#D4AF37]/12 text-[#E5C158] border-[#D4AF37]/35',
    green: 'bg-emerald-950/60 text-emerald-300 border-emerald-600/40',
    red: 'bg-red-950/60 text-red-300 border-red-600/40',
    gray: 'bg-[#14141B] text-[#A9A292] border-[#D4AF37]/18',
  } as const;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-lg border text-[10px] font-bold ${map[tone]}`}>
      {children}
    </span>
  );
};

export const Table: React.FC<{ head: string[]; children: React.ReactNode; empty?: string }> = ({
  head,
  children,
  empty,
}) => (
  <div className="overflow-x-auto">
    <table className="w-full text-xs text-right">
      <thead>
        <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
          {head.map((h, i) => (
            <th key={i} className="py-2.5 px-2 font-bold whitespace-nowrap">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-[#D4AF37]/10">
        {children}
        {empty && (
          <tr>
            <td colSpan={head.length} className="py-8 text-center text-[#7C7565] text-[11px]">
              {empty}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

export const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div className="py-10 text-center text-[#7C7565] text-xs">{text}</div>
);

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'gold' | 'outline' | 'ghost'; size?: 'sm' | 'md' }
> = ({ variant = 'gold', size = 'md', className = '', children, ...rest }) => {
  const base = 'rounded-xl font-bold cursor-pointer transition disabled:opacity-45 disabled:cursor-not-allowed inline-flex items-center gap-1.5';
  const variants = {
    gold: 'gold-metallic-btn',
    outline: 'bg-[#14141B] border border-[#D4AF37]/35 text-[#E5C158] hover:bg-[#1A1A23] hover:border-[#D4AF37]/60',
    ghost: 'text-[#A9A292] hover:text-[#E5C158] hover:bg-[#14141B]',
  } as const;
  const sizes = { sm: 'px-3 py-1.5 text-[11px]', md: 'px-4 py-2.5 text-xs' } as const;
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest}>
      {children}
    </button>
  );
};

export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode; className?: string }> = ({
  label,
  hint,
  children,
  className = '',
}) => (
  <label className={`block ${className}`}>
    <span className="text-[11px] text-[#C7BFA9] block mb-1">{label}</span>
    {children}
    {hint && <span className="text-[10px] text-[#6F6A5D] mt-1 block">{hint}</span>}
  </label>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...rest }) => (
  <input className={`w-full gold-input rounded-xl px-3 py-2 text-xs ${className}`} {...rest} />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className = '', children, ...rest }) => (
  <select className={`w-full gold-input rounded-xl px-3 py-2 text-xs ${className}`} {...rest}>
    {children}
  </select>
);

/** شريط رسالة عابر — نجاح أو خطأ. لا يختفي قبل أن يقرأه المستخدم. */
export const Notice: React.FC<{ tone: 'ok' | 'err'; onClose?: () => void; children: React.ReactNode }> = ({
  tone,
  onClose,
  children,
}) => (
  <div
    role="status"
    className={`p-3.5 rounded-xl text-xs border flex items-start justify-between gap-3 ${
      tone === 'ok'
        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
        : 'bg-red-950/60 border-red-500/50 text-red-200'
    }`}
  >
    <div className="leading-relaxed">{children}</div>
    {onClose && (
      <button onClick={onClose} className="text-current opacity-70 hover:opacity-100 cursor-pointer shrink-0" aria-label="إغلاق">
        ✕
      </button>
    )}
  </div>
);

export const Spinner: React.FC<{ label: string }> = ({ label }) => (
  <div className="py-16 flex flex-col items-center gap-3">
    <div className="w-9 h-9 rounded-full border-2 border-[#D4AF37]/25 border-t-[#D4AF37] animate-plus-spin-fast" />
    <span className="text-[11px] text-[#9A9282]">{label}</span>
  </div>
);

/** شريط تبويبات داخلي */
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string; icon?: React.ReactNode }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
  <div className="flex flex-wrap gap-2">
    {tabs.map((t) => (
      <button
        key={t.id}
        onClick={() => onChange(t.id)}
        className={`px-3.5 py-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition ${
          active === t.id
            ? 'gold-metallic-btn'
            : 'bg-[#111116] text-[#D7CEB8] border border-[#D4AF37]/25 hover:border-[#D4AF37]/50'
        }`}
      >
        {t.icon}
        {t.label}
      </button>
    ))}
  </div>
  );
}

/** صف ملخص في نهاية جدول — الأرقام تُقرأ بخط أوضح من الصفوف */
export const TotalRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs border-t border-[#D4AF37]/20 pt-3">
    <span className="text-[#9A9282]">{label}</span>
    <span className="font-extrabold text-[#E5C158]">{children}</span>
  </div>
);

export const today = () => new Date().toISOString().slice(0, 10);
