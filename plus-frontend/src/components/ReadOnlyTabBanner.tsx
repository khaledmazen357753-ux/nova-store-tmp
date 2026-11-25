import React, { useEffect, useState } from 'react';
import { Eye, RefreshCw } from 'lucide-react';
import { onWriterChange } from '../offline/tabLock';

/**
 * شريط يظهر عندما يكون النظام مفتوحاً للكتابة في تبويب آخر.
 *
 * السبب: كل تبويب يملك نسخة من قاعدة البيانات في الذاكرة، فلو كتب تبويبان
 * معاً لحفظ كلٌّ منهما نسخته فوق الأخرى وضاع عمل أحدهما. لذلك يعمل تبويب
 * واحد فقط للكتابة، وهذا الشريط يخبر المستخدم بالحقيقة بدل أن يفاجأ بأن
 * الحفظ لا يعمل.
 */
export const ReadOnlyTabBanner: React.FC = () => {
  const [writer, setWriter] = useState(true);

  useEffect(() => onWriterChange(setWriter), []);

  if (writer) return null;

  return (
    <div className="no-print bg-[#241a05] border-b border-[#D4AF37]/40 px-4 py-2 flex items-center justify-between gap-3 text-[11px]">
      <div className="flex items-center gap-2 text-[#FCE79C] min-w-0">
        <Eye className="w-3.5 h-3.5 shrink-0" />
        <span className="font-bold shrink-0">وضع العرض فقط</span>
        <span className="text-[#C9BC96] truncate">
          النظام مفتوح للكتابة في تبويب آخر — أي حفظ من هنا سيُرفض لحماية بياناتك.
        </span>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#FCE79C] font-bold hover:bg-[#D4AF37]/25 cursor-pointer transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        <span>إعادة تحميل</span>
      </button>
    </div>
  );
};
