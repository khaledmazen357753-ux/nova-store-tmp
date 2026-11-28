import React from 'react';

/**
 * حاجز الأخطاء — يحوّل أي انهيار في مكوّن إلى رسالة مفهومة
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ─ لماذا هذا الملف ضروري وقد بدا "تحسيناً اختيارياً"؟ ───────────────
 *
 * حين رمى React خطأ الـHooks في شاشة طلبات التعديل، **محا الشجرة كلها**.
 * المستخدم رأى شاشة سوداء فارغة بلا نص ولا زر، وفقد كل ما كان يعمله في
 * تلك الجلسة. والأسوأ: الشكل نفسه يحدث لأي خطأ في أي مكوّن — فكل عطل
 * مستقبلي سيبدو كأن "التطبيق كله تعطّل".
 *
 * Error Boundary يحوّل ذلك إلى:
 *   • نص يقول ما حدث بلغة مفهومة
 *   • تفاصيل تقنية قابلة للنسخ (للتشخيص)
 *   • زر "إعادة المحاولة" يُعيد تركيب الشجرة بلا فقدان البيانات المحفوظة
 *   • زر "إعادة التحميل الكامل" للحالات التي تحتاج بداية نظيفة
 *
 * ─ لماذا class وليس function؟ ──────────────────────────────────────
 * `componentDidCatch` و`getDerivedStateFromError` لا نظير لهما في الـHooks.
 * هذا هو الموضع الوحيد في React الذي **يجب** أن يكون class.
 *
 * ─ لماذا نُظهر تفاصيل تقنية للمستخدم؟ ──────────────────────────────
 * لأن "حدث خطأ" وحدها لا تُشخّص شيئاً. المطوّر أو المستخدم يستطيع نسخ
 * الرسالة وإرسالها. نخفيها خلف "تفاصيل" لتظل الشاشة نظيفة بصرياً.
 */

interface Props {
  children: React.ReactNode;
  /** اسم المنطقة — يظهر في الرسالة ليعرف المستخدم أين حدث الخطأ */
  area?: string;
}

interface State {
  error: Error | null;
  info: string;
  /** يُستخدم لإعادة التركيب: تغييره يمحو حالة الشجرة الفرعية */
  retryKey: number;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, info: '', retryKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // نُسجّل في الطرفية أيضاً: المستخدم قد لا يفتح التفاصيل، لكن السجل
    // يبقى متاحاً لمن يفحص المشكلة لاحقاً.
    console.error('[Plus ERP] انهيار مكوّن:', error, errorInfo.componentStack);
    this.setState({ info: String(errorInfo.componentStack || '').slice(0, 1200) });
  }

  private retry = () => {
    // تغيير retryKey يُعيد تركيب الأبناء من الصفر، فتمحُو حالة الخطأ.
    // البيانات في IndexedDB لا تُمَس — هذا إعادة تركيب للواجهة فقط.
    this.setState((s) => ({ error: null, info: '', retryKey: s.retryKey + 1 }));
  };

  render() {
    const { error, info } = this.state;

    if (!error) {
      return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>;
    }

    return (
      <div
        dir="rtl"
        className="min-h-screen w-full flex items-center justify-center p-5 bg-[#060608]"
        style={{ fontFamily: 'inherit' }}
      >
        <div className="w-full max-w-lg rounded-2xl bg-[#0B0B10] border border-[#D4AF37]/30 shadow-2xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center shrink-0">
              <span className="text-rose-400 text-lg font-bold">!</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-extrabold text-[#FAF5E8]">
                تعذّر عرض {this.props.area || 'هذا الجزء'}
              </h1>
              <p className="text-[11px] text-[#9E9682] mt-1 leading-relaxed">
                حدث خطأ غير متوقع في الواجهة. بياناتك المحفوظة سليمة ولم تُمس — الخطأ في
                العرض فقط.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#13131A] border border-[#D4AF37]/15">
            <div className="text-[10px] text-[#7E8B84] mb-1">الخطأ</div>
            <div className="text-[11px] text-rose-300 font-mono leading-relaxed break-words">
              {error.message || String(error)}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={this.retry}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#D4AF37] hover:bg-[#E5C158] text-[#0B0B10] cursor-pointer transition-colors"
            >
              إعادة المحاولة
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#13131A] hover:bg-[#1A1A24] border border-[#D4AF37]/25 text-[#E2DAC6] cursor-pointer transition-colors"
            >
              إعادة تحميل الصفحة
            </button>
          </div>

          <details className="rounded-xl bg-[#0F0F16] border border-[#D4AF37]/10 overflow-hidden">
            <summary className="px-3 py-2 text-[10px] font-bold text-[#9E9682] cursor-pointer hover:text-[#D4AF37]">
              تفاصيل تقنية (للإبلاغ عن المشكلة)
            </summary>
            <pre
              dir="ltr"
              className="px-3 pb-3 text-[9px] leading-relaxed text-[#7E8B84] whitespace-pre-wrap break-words max-h-52 overflow-y-auto font-mono"
            >
              {error.stack || error.message}
              {info ? `\n\n${info}` : ''}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
