import React from 'react';

/**
 * إعادة رسم هندسية دقيقة لشكل علامة الزائد الذهبية الملكية المرصعة بالألماس وأوراق الغار
 * المطابقة تماماً للشعار المرفق من المستخدم (تُستخدم كأيقونة، وكعلامة مائية، وكشعار تحميل دوّار)
 */
export const PlusCrossEmblem: React.FC<{
  size?: number;
  className?: string;
  idPrefix?: string;
}> = ({ size = 64, className = '', idPrefix = 'plus-emblem' }) => {
  const gLight = `${idPrefix}-gold-light`;
  const gDark = `${idPrefix}-gold-dark`;
  const gMid = `${idPrefix}-gold-mid`;
  const gGem = `${idPrefix}-gem`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gLight} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF6C7" />
          <stop offset="45%" stopColor="#E9C662" />
          <stop offset="100%" stopColor="#C59B27" />
        </linearGradient>
        <linearGradient id={gDark} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C89E2B" />
          <stop offset="55%" stopColor="#9A7217" />
          <stop offset="100%" stopColor="#634609" />
        </linearGradient>
        <linearGradient id={gMid} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FBE59B" />
          <stop offset="50%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#8C6714" />
        </linearGradient>
        <radialGradient id={gGem} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="65%" stopColor="#FDF1C4" />
          <stop offset="100%" stopColor="#C9A227" />
        </radialGradient>
      </defs>

      {/* الأوراق الذهبية الثماني الموزعة في الزوايا الأربع حول علامة الزائد */}
      {[0, 90, 180, 270].map((rot) => (
        <g key={`leaves-${rot}`} transform={`rotate(${rot} 100 100)`}>
          {/* الورقة الأولى بزاوية 32 درجة */}
          <g transform="rotate(32 100 100)">
            <path
              d="M100 84 C93 64, 94 48, 100 36 C100 54, 100 70, 100 84 Z"
              fill={`url(#${gLight})`}
            />
            <path
              d="M100 84 C107 64, 106 48, 100 36 C100 54, 100 70, 100 84 Z"
              fill={`url(#${gDark})`}
            />
            <path
              d="M100 36 C94 48, 93 64, 100 84 C107 64, 106 48, 100 36 Z"
              stroke="#FCE79C"
              strokeWidth="0.8"
              strokeOpacity="0.6"
            />
          </g>
          {/* الورقة الثانية بزاوية 58 درجة */}
          <g transform="rotate(58 100 100)">
            <path
              d="M100 84 C93 64, 94 48, 100 36 C100 54, 100 70, 100 84 Z"
              fill={`url(#${gLight})`}
            />
            <path
              d="M100 84 C107 64, 106 48, 100 36 C100 54, 100 70, 100 84 Z"
              fill={`url(#${gDark})`}
            />
            <path
              d="M100 36 C94 48, 93 64, 100 84 C107 64, 106 48, 100 36 Z"
              stroke="#FCE79C"
              strokeWidth="0.8"
              strokeOpacity="0.6"
            />
          </g>
        </g>
      ))}

      {/* الأذرع الأربعة الرئيسية لعلامة الزائد (+) بتجسيم ثلاثي الأبعاد ورؤوس مرصعة بالألماس */}
      {[0, 90, 180, 270].map((rot) => (
        <g key={`arm-${rot}`} transform={`rotate(${rot} 100 100)`}>
          {/* الإطار الخارجي المرصع للذراع */}
          <polygon
            points="100,6 121,42 113,87 87,87 79,42"
            fill={`url(#${gMid})`}
            stroke="#FFF1B5"
            strokeWidth="1.2"
          />
          {/* الوجه الأيسر المضيء للذراع */}
          <polygon points="100,16 100,100 89,89 83,44" fill={`url(#${gLight})`} />
          {/* الوجه الأيمن الداكن للذراع لإبراز التجسيم المعدني */}
          <polygon points="100,16 117,44 111,89 100,100" fill={`url(#${gDark})`} />

          {/* خط البروز الذهبي الأوسط للزائد */}
          <line x1="100" y1="16" x2="100" y2="100" stroke="#FFF8D6" strokeWidth="1.6" />

          {/* فصوص الألماس الثلاثة في قمة كل ذراع من أذرع الزائد */}
          <polygon points="100,8 103.5,13 100,18 96.5,13" fill={`url(#${gGem})`} />
          <circle cx="92" cy="24" r="2.5" fill={`url(#${gGem})`} />
          <circle cx="108" cy="24" r="2.5" fill={`url(#${gGem})`} />
          <circle cx="86.5" cy="34" r="2" fill={`url(#${gGem})`} />
          <circle cx="113.5" cy="34" r="2" fill={`url(#${gGem})`} />
        </g>
      ))}

      {/* قلب علامة الزائد الذهبي المتقاطع في المنتصف */}
      <rect x="93" y="42" width="14" height="116" rx="1" fill={`url(#${gMid})`} opacity="0.92" />
      <rect x="42" y="93" width="116" height="14" rx="1" fill={`url(#${gMid})`} opacity="0.92" />
      <line x1="100" y1="30" x2="100" y2="170" stroke="#FFF5C3" strokeWidth="1.5" />
      <line x1="30" y1="100" x2="170" y2="100" stroke="#FFF5C3" strokeWidth="1.5" />
      <polygon points="100,91 109,100 100,109 91,100" fill={`url(#${gLight})`} stroke="#7B5810" strokeWidth="1" />
    </svg>
  );
};

/**
 * التاج الملكي الذهبي المرصع الذي يعلو كلمة Plus في الشعار الأصلي
 */
export const RoyalCrownSvg: React.FC<{ size?: number; className?: string }> = ({ size = 40, className = '' }) => (
  <svg width={size} height={Math.round(size * 0.65)} viewBox="0 0 120 78" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="plus-crown-gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFF3BD" />
        <stop offset="50%" stopColor="#D4AF37" />
        <stop offset="100%" stopColor="#8E6815" />
      </linearGradient>
    </defs>
    <path
      d="M16 62 L6 24 L37 44 L60 10 L83 44 L114 24 L104 62 Z"
      fill="url(#plus-crown-gold)"
      stroke="#FFF3BD"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <polygon points="60,18 71,48 60,56 49,48" fill="#FFF2BE" opacity="0.85" />
    <rect x="15" y="64" width="90" height="8" rx="3" fill="url(#plus-crown-gold)" stroke="#FCE79C" strokeWidth="1" />
    <circle cx="6" cy="21" r="4" fill="#FFF8DC" />
    <circle cx="60" cy="8" r="4.5" fill="#FFF8DC" />
    <circle cx="114" cy="21" r="4" fill="#FFF8DC" />
  </svg>
);

/**
 * شعار المحاسبي Plus الكامل مع خيار عرض صورة الشعار الأصلية المرفقة
 */
export const PlusBrandLockup: React.FC<{
  compact?: boolean;
  subtitle?: string;
  showOriginalCard?: boolean;
}> = ({ compact = false, subtitle = 'نظام المعلومات المحاسبية المتكامل', showOriginalCard = false }) => {
  if (showOriginalCard) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-32 h-32 rounded-2xl overflow-hidden border border-[#D4AF37]/60 shadow-[0_0_35px_rgba(212,175,55,0.28)] bg-black">
          <img
            src="/plus-logo.jpeg"
            alt="شعار المحاسبي Plus"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl font-extrabold text-[#F7F3E8]">المحاسبي</span>
            <span className="text-2xl font-bold font-royal gold-gradient-text tracking-wider">Plus</span>
          </div>
          <p className="text-xs text-[#B5AD99] mt-0.5">{subtitle}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 select-none">
      <div className="relative flex-shrink-0 w-12 h-12 rounded-xl bg-black border border-[#D4AF37]/50 flex items-center justify-center shadow-[0_0_18px_rgba(212,175,55,0.2)] overflow-hidden">
        <img src="/plus-logo.jpeg" alt="Plus Logo" className="w-full h-full object-cover" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-extrabold text-[#F7F3E8]">المحاسبي</span>
            <span className="text-xl font-bold font-royal gold-gradient-text tracking-wide">Plus</span>
          </div>
          <p className="text-[11px] text-[#ACA38E]">{subtitle}</p>
        </div>
      )}
    </div>
  );
};

/**
 * شعار التحميل الدوّار بنفس شكل علامة الزائد الذهبية الموجودة في الصورة
 */
export const PlusSpinner: React.FC<{
  size?: number;
  label?: string;
  fullScreen?: boolean;
}> = ({ size = 68, label = 'جارٍ تحميل البيانات المحاسبية...', fullScreen = false }) => {
  const spinnerNode = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative flex items-center justify-center" style={{ width: size + 24, height: size + 24 }}>
        <div
          className="absolute inset-0 rounded-full border border-[#D4AF37]/30 animate-gold-pulse"
          style={{ boxShadow: '0 0 36px rgba(212, 175, 55, 0.25)' }}
        />
        <PlusCrossEmblem
          size={size}
          idPrefix={`spinner-${size}`}
          className="animate-plus-spin drop-shadow-[0_0_16px_rgba(212,175,55,0.55)]"
        />
      </div>
      {label && (
        <div className="text-center">
          <p className="text-sm font-semibold gold-gradient-text tracking-wide">{label}</p>
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#060608]/95 backdrop-blur-md flex flex-col items-center justify-center">
        {spinnerNode}
      </div>
    );
  }

  return <div className="py-10 flex items-center justify-center">{spinnerNode}</div>;
};

/**
 * العلامة المائية الخلفية بنفس شكل علامة الزائد الذهبية الموجودة في الصورة
 * تظهر بهدوء وأناقة خلف الشاشات وفي التقارير المطبوعة دون إعاقة القراءة
 */
export const PlusWatermark: React.FC = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center select-none"
      aria-hidden="true"
    >
      {/* العلامة المائية المركزية الكبرى بشكل علامة الزائد الملكية */}
      <div className="opacity-[0.045] print:opacity-[0.07] transform scale-110">
        <PlusCrossEmblem size={540} idPrefix="wm-center" />
      </div>
      {/* علامات مائية جانبية ناعمة لتعزيز الهوية البصرية */}
      <div className="hidden lg:block absolute -top-16 -left-16 opacity-[0.025] print:hidden">
        <PlusCrossEmblem size={240} idPrefix="wm-tl" />
      </div>
      <div className="hidden lg:block absolute -bottom-16 -right-16 opacity-[0.025] print:hidden">
        <PlusCrossEmblem size={240} idPrefix="wm-br" />
      </div>
    </div>
  );
};
